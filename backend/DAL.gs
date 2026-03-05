
/* -------------------------------------------------------------------------- */
/*                             DATA ACCESS LAYER                              */
/* -------------------------------------------------------------------------- */

const DAL = (function() {
  
  // CACHE: To prevent repeated getSheetByName calls
  const sheetCache = {};
  const SSID = SpreadsheetApp.getActiveSpreadsheet().getId();

  function _getSheet(tableName) {
    if (!sheetCache[tableName]) {
      const ss = SpreadsheetApp.openById(SSID);
      const sheet = ss.getSheetByName(tableName);
      if (!sheet) throw new Error(`Table (Sheet) '${tableName}' not found.`);
      sheetCache[tableName] = sheet;
    }
    return sheetCache[tableName];
  }

  function _getHeaders(sheet) {
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  function _rowToObject(row, headers) {
    const obj = {};
    headers.forEach((header, index) => {
      let value = row[index];
      // Attempt to parse JSON strings for known fields or if it looks like JSON
      if ((header.toLowerCase().includes('json') || header.toLowerCase().includes('log') || header.toLowerCase().includes('history') || (typeof value === 'string' && (value.startsWith('{') && value.endsWith('}') || value.startsWith('[') && value.endsWith(']'))))) {
        value = Utilities.safeJSONParse(value) || value; // Store original if parsing fails
      }
      obj[header] = value;
    });
    return obj;
  }

  function _objectToRow(obj, headers) {
    return headers.map(header => {
      const val = obj[header];
      if (val === undefined || val === null) return '';
      if (typeof val === 'object') return JSON.stringify(val); // Handle JSON columns
      if (val instanceof Date) return val.toISOString(); // Force ISO Dates
      return val;
    });
  }

  return {
    /**
     * SELECT * FROM table WHERE filter
     */
    query: function(tableName, filterFn = null) {
      const sheet = _getSheet(tableName);
      const data = sheet.getDataRange().getValues();
      const headers = data.shift(); // Remove header row

      let results = data.map(row => _rowToObject(row, headers));

      if (filterFn) {
        results = results.filter(filterFn);
      }
      return results;
    },

    /**
     * SELECT * FROM table WHERE id = id LIMIT 1
     */
    getById: function(tableName, id) {
      const results = this.query(tableName, item => item.id === id || item.ID === id || item.Ticket_ID === id);
      return results.length > 0 ? results[0] : null;
    },

    /**
     * INSERT INTO table VALUES (obj)
     */
    insert: function(tableName, dataObject) {
      const sheet = _getSheet(tableName);
      const headers = _getHeaders(sheet);
      
      // Generate UUID if not present and table implies an ID
      if (!dataObject.id && !dataObject.ID && !dataObject.Ticket_ID) {
        dataObject.id = Utilities.getUuid();
      }

      const row = _objectToRow(dataObject, headers);
      sheet.appendRow(row);
      return dataObject;
    },

    /**
     * UPDATE table SET values WHERE id = id
     */
    update: function(tableName, id, partialObject) {
      const sheet = _getSheet(tableName);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // Find row index (1-based for Sheet API, but data is 0-based array)
      const idColIndex = headers.findIndex(h => h.toLowerCase().includes('id'));
      if (idColIndex === -1) throw new Error(`Table ${tableName} has no ID column`);

      // Scan rows (Start at 1 to skip header)
      for (let i = 1; i < data.length; i++) {
        if (data[i][idColIndex] === id) {
          const currentRowObj = _rowToObject(data[i], headers);
          const updatedObj = { ...currentRowObj, ...partialObject };
          const newRow = _objectToRow(updatedObj, headers);
          
          sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
          return updatedObj;
        }
      }
      throw new Error(`Record ID ${id} not found in ${tableName}`);
    },

    /**
     * Batch INSERT for performance
     */
    batchInsert: function(tableName, arrayObjects) {
      if (arrayObjects.length === 0) return;
      const sheet = _getSheet(tableName);
      const headers = _getHeaders(sheet);
      
      const rows = arrayObjects.map(obj => {
        if (!obj.id && !obj.ID) obj.id = Utilities.getUuid();
        return _objectToRow(obj, headers);
      });

      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
  };
})();