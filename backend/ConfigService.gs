
/* -------------------------------------------------------------------------- */
/*                               CONFIG SERVICE                               */
/* -------------------------------------------------------------------------- */

const ConfigService = {
  getPublicConfig: function() {
    const raw = DAL.query('Admin_Config');
    // Convert array of {Key, Value} to single object
    const config = {};
    raw.forEach(item => {
      config[item.Config_Key] = item.Value;
    });
    return config;
  },

  getValue: function(key) {
    const row = DAL.query('Admin_Config', item => item.Config_Key === key);
    return row.length > 0 ? row[0].Value : null;
  }
};
