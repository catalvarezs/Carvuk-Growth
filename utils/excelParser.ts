import * as XLSX from 'xlsx';
import { ExcelData, ExcelRow, SheetData } from '../types';

export const fetchGoogleSheet = async (sheetId: string): Promise<ExcelData> => {
  try {
    // Construct the CSV export URL for the Google Sheet
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }

    const csvData = await response.text();
    
    // Parse CSV data using XLSX
    const workbook = XLSX.read(csvData, { type: 'string' });
    const parsedSheets: SheetData[] = [];

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
        header: 0,
        defval: "",
        raw: false
      });

      if (jsonData.length > 0) {
        const columns = Object.keys(jsonData[0]);
        parsedSheets.push({
          sheetName: sheetName,
          columns: columns,
          rows: jsonData
        });
      }
    });

    if (parsedSheets.length === 0) {
      throw new Error("Google Sheet appears to be empty or has no readable data");
    }

    return {
      fileName: `Sheet_${sheetId}`,
      sheets: parsedSheets
    };
  } catch (error) {
    console.error("Error fetching Google Sheet:", error);
    throw error;
  }
};

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Failed to read file"));
          return;
        }

        // Parse with cellDates: true to handle date fields correctly if they aren't strings
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const parsedSheets: SheetData[] = [];

        // Iterate through all sheets
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          
          // Parse to JSON with raw: false to get formatted strings (e.g. "$1,000" instead of 1000)
          // This helps the LLM understand the nature of the data better (currency, percentage, dates)
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { 
            header: 0, 
            defval: "",
            raw: false 
          });

          // Only add non-empty sheets
          if (jsonData.length > 0) {
            // Extract columns from the first row keys
            const columns = Object.keys(jsonData[0]);
            
            parsedSheets.push({
              sheetName: sheetName,
              columns: columns,
              rows: jsonData
            });
          }
        });

        if (parsedSheets.length === 0) {
            reject(new Error("Excel file appears to be empty or has no readable data"));
            return;
        }

        resolve({
          fileName: file.name,
          sheets: parsedSheets
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};