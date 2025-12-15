const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let quickNextEnabled = true; // Enabled by default
let currentIndex = 0;
let copyFieldIndex = 0; // Índice del campo actual en la secuencia de copiado
let items = [];
let config = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 500,
    minWidth: 250,
    minHeight: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setAlwaysOnTop(true, 'floating');

  // Permitir que la ventana no capture el foco al hacer click
  mainWindow.setVisibleOnAllWorkspaces(true);
}

function registerGlobalShortcuts() {
  // Ctrl+Up - Previous row
  const goPrevRow = () => {
    if (currentIndex > 0) {
      currentIndex--;
      copyFieldIndex = 0;
      copyCurrentAndNotify();
    }
  };

  // Ctrl+Down - Next row
  const goNextRow = () => {
    if (currentIndex < items.length - 1) {
      currentIndex++;
      copyFieldIndex = 0;
      copyCurrentAndNotify();
    }
  };

  // Ctrl+Left - Previous copy field (or prev row if at start)
  const goPrevField = () => {
    const copyFields = config.copy_fields || (config.copy_field ? [config.copy_field] : []);
    if (copyFieldIndex > 0) {
      copyFieldIndex--;
      copyCurrentAndNotify();
    } else if (currentIndex > 0) {
      currentIndex--;
      copyFieldIndex = copyFields.length > 1 ? copyFields.length - 1 : 0;
      copyCurrentAndNotify();
    }
  };

  // Ctrl+Right - Next copy field (or next row if at end)
  const goNextField = () => {
    const copyFields = config.copy_fields || (config.copy_field ? [config.copy_field] : []);
    if (copyFields.length > 1 && copyFieldIndex < copyFields.length - 1) {
      copyFieldIndex++;
      copyCurrentAndNotify();
    } else if (currentIndex < items.length - 1) {
      currentIndex++;
      copyFieldIndex = 0;
      copyCurrentAndNotify();
    }
  };

  // Ctrl+Up/Down - Change rows
  globalShortcut.register('CommandOrControl+Up', goPrevRow);
  globalShortcut.register('CommandOrControl+Down', goNextRow);

  // Ctrl+Left/Right - Change copy fields (with row jump)
  globalShortcut.register('CommandOrControl+Left', goPrevField);
  globalShortcut.register('CommandOrControl+Right', goNextField);

  // F9 - Copy and advance
  globalShortcut.register('F9', advanceCopySequence);

  // Ctrl+Space - Quick advance (enabled by default)
  if (quickNextEnabled) {
    globalShortcut.register('CommandOrControl+Space', advanceCopySequence);
  }
}

function copyCurrentAndNotify(shouldCopy = true) {
  if (items.length > 0 && items[currentIndex]) {
    if (shouldCopy) {
      const copyFields = config.copy_fields || (config.copy_field ? [config.copy_field] : []);

      if (copyFields.length > 0) {
        const fieldToCopy = copyFields[copyFieldIndex] || copyFields[0];
        const valueToCopy = items[currentIndex][fieldToCopy];

        if (valueToCopy !== null && valueToCopy !== undefined) {
          clipboard.writeText(String(valueToCopy));
        }
      }
    }

    mainWindow.webContents.send('update-index', {
      currentIndex,
      copyFieldIndex,
      total: items.length,
      items,
      config
    });
  }
}

// Advance to next field in sequence, or to next item if sequence completed
function advanceCopySequence() {
  const copyFields = config.copy_fields || (config.copy_field ? [config.copy_field] : []);

  if (copyFields.length <= 1) {
    // Single field - always advance to next item
    if (currentIndex < items.length - 1) {
      currentIndex++;
      copyFieldIndex = 0;
    }
  } else {
    // Multiple fields - advance through sequence
    copyFieldIndex++;

    if (copyFieldIndex >= copyFields.length) {
      // Completed all fields for this item - go to next item
      copyFieldIndex = 0;
      if (currentIndex < items.length - 1) {
        currentIndex++;
      }
    }
  }

  copyCurrentAndNotify();
}

function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Look for configuration in @copyloto or copyloto_config
    const autoConfig = data['@copyloto'] || data['copyloto_config'];
    if (autoConfig) {
      config = autoConfig;
      const arrayPath = config.array_path || 'items';
      items = data[arrayPath] || [];
      currentIndex = 0;
      copyFieldIndex = 0;

      if (items.length > 0) {
        copyCurrentAndNotify();
      }

      return { success: true, config, itemCount: items.length, needsConfig: false };
    } else {
      // No config - find available arrays for user to configure
      const availableArrays = [];

      for (const key of Object.keys(data)) {
        if (key !== '@copyloto' && key !== 'copyloto_config' && Array.isArray(data[key]) && data[key].length > 0) {
          const firstItem = data[key][0];
          const fields = (firstItem && typeof firstItem === 'object') ? Object.keys(firstItem) : [];
          availableArrays.push({
            key,
            count: data[key].length,
            fields
          });
        }
      }

      // If root is an array
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        const fields = (firstItem && typeof firstItem === 'object') ? Object.keys(firstItem) : [];
        availableArrays.push({
          key: '__root__',
          count: data.length,
          fields
        });
      }

      // Store data temporarily until user configures
      global.pendingData = data;
      global.pendingFilePath = filePath;

      return {
        success: true,
        needsConfig: true,
        availableArrays,
        itemCount: 0
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Apply user configuration
function applyUserConfig(userConfig) {
  const data = global.pendingData;
  if (!data) return { success: false, error: 'No pending data' };

  config = {
    array_path: userConfig.array_path,
    display_fields: userConfig.display_fields || [],
    copy_field: userConfig.copy_field,
    copy_fields: userConfig.copy_fields || (userConfig.copy_field ? [userConfig.copy_field] : []),
    auto_advance: userConfig.auto_advance || false,
    color_rules: userConfig.color_rules || [],
    context_before: 2,
    context_after: 3
  };

  // Get items from selected array
  if (userConfig.array_path === '__root__') {
    items = data;
  } else {
    items = data[userConfig.array_path] || [];
  }

  currentIndex = 0;
  copyFieldIndex = 0;
  global.pendingData = null;

  if (items.length > 0) {
    copyCurrentAndNotify();
  }

  return { success: true, config, itemCount: items.length };
}

app.whenReady().then(() => {
  createWindow();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return loadJsonFile(result.filePaths[0]);
  }
  return { success: false, error: 'No file selected' };
});

ipcMain.handle('load-json-file', async (event, filePath) => {
  return loadJsonFile(filePath);
});

ipcMain.handle('set-index', async (event, index) => {
  if (index >= 0 && index < items.length) {
    currentIndex = index;
    copyFieldIndex = 0;
    copyCurrentAndNotify();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('get-current-state', async () => {
  return {
    currentIndex,
    copyFieldIndex,
    total: items.length,
    items,
    config
  };
});

ipcMain.handle('reset-copy-sequence', async () => {
  copyFieldIndex = 0;
  copyCurrentAndNotify(false);
  return { success: true };
});

ipcMain.handle('set-copy-field-index', async (event, index) => {
  copyFieldIndex = index;
  copyCurrentAndNotify();
  return { success: true };
});

ipcMain.handle('update-config', async (event, newConfig) => {
  // If copy_fields changes, reset sequence index
  if (newConfig.copy_fields) {
    copyFieldIndex = 0;
  }
  config = { ...config, ...newConfig };
  copyCurrentAndNotify();
  return { success: true };
});

ipcMain.handle('apply-user-config', async (event, userConfig) => {
  return applyUserConfig(userConfig);
});

ipcMain.handle('set-opacity', async (event, opacity) => {
  mainWindow.setOpacity(opacity);
  return { success: true };
});

ipcMain.handle('close-app', async () => {
  app.quit();
});

ipcMain.handle('minimize-app', async () => {
  mainWindow.minimize();
});

ipcMain.handle('toggle-quick-next', async (event, enabled) => {
  quickNextEnabled = enabled;
  if (enabled) {
    globalShortcut.register('CommandOrControl+Space', advanceCopySequence);
  } else {
    globalShortcut.unregister('CommandOrControl+Space');
  }
  return { success: true, enabled: quickNextEnabled };
});

ipcMain.handle('get-quick-next-state', async () => {
  return { enabled: quickNextEnabled };
});

// Paste JSON from clipboard
ipcMain.handle('paste-json', async () => {
  try {
    const jsonText = clipboard.readText();
    if (!jsonText || jsonText.trim() === '') {
      return { success: false, error: 'Clipboard is empty' };
    }

    const data = JSON.parse(jsonText);
    return processJsonData(data);
  } catch (error) {
    return { success: false, error: 'Invalid JSON: ' + error.message };
  }
});

// Load JSON data directly (from textarea paste)
ipcMain.handle('load-json-data', async (event, data) => {
  try {
    return processJsonData(data);
  } catch (error) {
    return { success: false, error: 'Invalid JSON: ' + error.message };
  }
});

// Process JSON data (shared logic)
function processJsonData(data) {
  // Look for configuration in @copyloto or copyloto_config
  const autoConfig = data['@copyloto'] || data['copyloto_config'];
  if (autoConfig) {
    config = autoConfig;
    const arrayPath = config.array_path || 'items';
    items = data[arrayPath] || [];
    currentIndex = 0;
    copyFieldIndex = 0;

    if (items.length > 0) {
      copyCurrentAndNotify();
    }

    return { success: true, config, itemCount: items.length, needsConfig: false };
  } else {
    // No config - find available arrays for user to configure
    const availableArrays = [];

    for (const key of Object.keys(data)) {
      if (key !== '@copyloto' && key !== 'copyloto_config' && Array.isArray(data[key]) && data[key].length > 0) {
        const firstItem = data[key][0];
        const fields = (firstItem && typeof firstItem === 'object') ? Object.keys(firstItem) : [];
        availableArrays.push({
          key,
          count: data[key].length,
          fields
        });
      }
    }

    // If root is an array
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      const fields = (firstItem && typeof firstItem === 'object') ? Object.keys(firstItem) : [];
      availableArrays.push({
        key: '__root__',
        count: data.length,
        fields
      });
    }

    // Store data temporarily until user configures
    global.pendingData = data;
    global.pendingFilePath = null;

    return {
      success: true,
      needsConfig: true,
      availableArrays,
      itemCount: 0
    };
  }
}
