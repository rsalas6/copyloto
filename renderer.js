const { ipcRenderer } = require('electron');

// State
let currentState = {
  currentIndex: 0,
  copyFieldIndex: 0,
  total: 0,
  items: [],
  config: {}
};

// Settings panel state
let settingsFieldsConfig = {};
let pendingArrays = [];
let modalFieldsConfig = {};

// DOM Elements
const btnLoad = document.getElementById('btn-load');
const btnSettings = document.getElementById('btn-settings');
const btnClose = document.getElementById('btn-close');
const btnMinimize = document.getElementById('btn-minimize');
const itemsList = document.getElementById('items-list');
const counter = document.getElementById('counter');
const copyIndicator = document.getElementById('copy-indicator');
const copyCurrentValue = document.getElementById('copy-current-value');
const copyCurrentLabel = document.getElementById('copy-current-label');
const copyNextDiv = document.getElementById('copy-next');
const copyNextValue = document.getElementById('copy-next-value');

// Load modal elements
const loadModal = document.getElementById('load-modal');
const btnCloseLoadModal = document.getElementById('btn-close-load-modal');
const btnOpenFile = document.getElementById('btn-open-file');
const btnPasteJson = document.getElementById('btn-paste-json');
const btnCancelLoad = document.getElementById('btn-cancel-load');
const jsonPasteArea = document.getElementById('json-paste-area');

// Config modal elements
const configModal = document.getElementById('config-modal');
const arraySelect = document.getElementById('array-select');
const modalFieldsTableBody = document.getElementById('modal-fields-table-body');
const btnApplyConfig = document.getElementById('btn-apply-config');
const btnCancelConfig = document.getElementById('btn-cancel-config');

// Settings panel elements
const settingsPanel = document.getElementById('settings-panel');
const btnCloseSettings = document.getElementById('btn-close-settings');
const darkModeCheck = document.getElementById('dark-mode-check');
const quickNextCheck = document.getElementById('quick-next-check');
const autoAdvanceCheck = document.getElementById('auto-advance-check');
const opacitySlider = document.getElementById('opacity-slider');
const opacityValue = document.getElementById('opacity-value');
const btnFontUp = document.getElementById('btn-font-up');
const btnFontDown = document.getElementById('btn-font-down');
const fontSizeValue = document.getElementById('font-size-value');
const previewSection = document.getElementById('preview-section');
const itemPreview = document.getElementById('item-preview');
const fieldsSettings = document.getElementById('fields-settings');
const fieldsTableBody = document.getElementById('fields-table-body');
const colorSettings = document.getElementById('color-settings');
const colorRulesList = document.getElementById('color-rules-list');
const btnAddColorRule = document.getElementById('btn-add-color-rule');
const btnSaveSettings = document.getElementById('btn-save-settings');

// Color rules state
let colorRulesConfig = [];

// Font size state
let currentFontSize = 14;

// ============ Event Listeners ============

// Load button - opens load modal
btnLoad.addEventListener('click', () => {
  loadModal.style.display = 'flex';
  jsonPasteArea.value = '';
});

btnCloseLoadModal.addEventListener('click', () => {
  loadModal.style.display = 'none';
});

btnCancelLoad.addEventListener('click', () => {
  loadModal.style.display = 'none';
});

// Open file from modal
btnOpenFile.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('open-file-dialog');
  loadModal.style.display = 'none';
  handleLoadResult(result);
});

// Paste JSON from modal
btnPasteJson.addEventListener('click', async () => {
  const jsonText = jsonPasteArea.value.trim();
  if (!jsonText) {
    // If textarea empty, try clipboard
    const result = await ipcRenderer.invoke('paste-json');
    loadModal.style.display = 'none';
    handleLoadResult(result);
  } else {
    // Parse from textarea
    try {
      const data = JSON.parse(jsonText);
      loadModal.style.display = 'none';
      // Send to main process for handling
      const result = await ipcRenderer.invoke('load-json-data', data);
      handleLoadResult(result);
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  }
});

// Settings
btnSettings.addEventListener('click', () => {
  showSettingsPanel();
});

btnCloseSettings.addEventListener('click', () => {
  settingsPanel.style.display = 'none';
});

btnSaveSettings.addEventListener('click', async () => {
  await saveSettingsConfig();
  settingsPanel.style.display = 'none';
});

// Window controls
btnClose.addEventListener('click', () => {
  ipcRenderer.invoke('close-app');
});

btnMinimize.addEventListener('click', () => {
  ipcRenderer.invoke('minimize-app');
});

// Opacity
opacitySlider.addEventListener('input', (e) => {
  const value = e.target.value;
  opacityValue.textContent = `${value}%`;
  ipcRenderer.invoke('set-opacity', value / 100);
});

// Dark mode toggle
darkModeCheck.addEventListener('change', () => {
  document.body.classList.toggle('dark', darkModeCheck.checked);
  localStorage.setItem('darkMode', darkModeCheck.checked);
});

// Quick next toggle
quickNextCheck.addEventListener('change', async () => {
  await ipcRenderer.invoke('toggle-quick-next', quickNextCheck.checked);
});

// Font size controls
btnFontUp.addEventListener('click', () => {
  currentFontSize++;
  applyFontSize();
  renderPreview();
});

btnFontDown.addEventListener('click', () => {
  if (currentFontSize > 8) {
    currentFontSize--;
    applyFontSize();
    renderPreview();
  }
});

function applyFontSize() {
  fontSizeValue.textContent = currentFontSize;
  document.documentElement.style.setProperty('--item-font-size', `${currentFontSize}px`);
  localStorage.setItem('fontSize', currentFontSize);
  if (currentState.items.length > 0) {
    renderItemsList();
  }
}

// ============ Load handling ============

function handleLoadResult(result) {
  if (result.success) {
    if (result.needsConfig) {
      pendingArrays = result.availableArrays;
      showConfigModal(result.availableArrays);
    } else {
      showCopiedFlash();
    }
  } else {
    alert('Error: ' + result.error);
  }
}

// ============ Settings Panel ============

async function showSettingsPanel() {
  const { config, items } = currentState;

  // Load quick-next state
  try {
    const result = await ipcRenderer.invoke('get-quick-next-state');
    quickNextCheck.checked = result.enabled;
  } catch (e) {
    quickNextCheck.checked = true;
  }

  autoAdvanceCheck.checked = config.auto_advance || false;

  // Show field settings only if items loaded
  if (items.length > 0) {
    previewSection.style.display = 'block';
    fieldsSettings.style.display = 'block';
    colorSettings.style.display = 'block';
    initSettingsFieldsConfig();
    renderSettingsTable();
    initColorRules();
    renderPreview();
  } else {
    previewSection.style.display = 'none';
    fieldsSettings.style.display = 'none';
    colorSettings.style.display = 'none';
  }

  settingsPanel.style.display = 'flex';
}

function renderPreview() {
  const { currentIndex, items, config } = currentState;
  if (items.length === 0) return;

  const item = items[currentIndex];
  const displayFields = config.display_fields || [];
  const copyFields = config.copy_fields || (config.copy_field ? [config.copy_field] : []);
  const fieldsToShow = displayFields.length > 0 ? displayFields : Object.keys(item).slice(0, 3);

  const principalValue = item[fieldsToShow[0]] || '';

  // Copy boxes like in the real view
  let copyBoxesHtml = '';
  if (copyFields.length === 1) {
    const value = item[copyFields[0]] || '';
    copyBoxesHtml = `<div class="preview-copy-box active">${escapeHtml(truncate(String(value), 30))}</div>`;
  } else if (copyFields.length > 1) {
    copyBoxesHtml = copyFields.map((f, idx) => {
      const value = item[f] || '';
      const activeClass = idx === 0 ? 'active' : '';
      return `<div class="preview-copy-box ${activeClass}">${escapeHtml(truncate(String(value), 25))}</div>`;
    }).join('');
  }

  itemPreview.innerHTML = `
    <div class="preview-item-header">
      <span class="preview-index">#${currentIndex + 1}</span>
      <span class="preview-principal" style="font-size: ${currentFontSize - 2}px">${escapeHtml(truncate(String(principalValue), 25))}</span>
    </div>
    ${copyBoxesHtml}
  `;
}

function initSettingsFieldsConfig() {
  const { items, config } = currentState;
  if (items.length === 0) return;

  const fields = Object.keys(items[0]);
  const displayFields = config.display_fields || [];
  const copyFields = config.copy_fields || (config.copy_field ? [config.copy_field] : []);

  settingsFieldsConfig = {};
  fields.forEach((field) => {
    const showOrder = displayFields.indexOf(field);
    const copyOrder = copyFields.indexOf(field);
    settingsFieldsConfig[field] = {
      show: displayFields.length === 0 || displayFields.includes(field),
      showOrder: showOrder >= 0 ? showOrder + 1 : 0,
      copy: copyOrder >= 0,
      order: copyOrder >= 0 ? copyOrder + 1 : 0
    };
  });
}

function renderSettingsTable() {
  const { items } = currentState;
  if (items.length === 0) return;

  const fields = Object.keys(items[0]);

  fieldsTableBody.innerHTML = fields.map(field => {
    const fc = settingsFieldsConfig[field] || { show: true, showOrder: 0, copy: false, order: 0 };
    return `
      <tr data-field="${field}">
        <td class="field-name">${field}</td>
        <td><input type="checkbox" class="show-check" ${fc.show ? 'checked' : ''}></td>
        <td><input type="number" class="show-order-input" min="0" max="99" value="${fc.showOrder}" readonly></td>
        <td><input type="checkbox" class="copy-check" ${fc.copy ? 'checked' : ''}></td>
        <td><input type="number" class="order-input" min="0" max="99" value="${fc.order}" readonly></td>
      </tr>
    `;
  }).join('');

  // Event listeners
  fieldsTableBody.querySelectorAll('tr').forEach(row => {
    const field = row.dataset.field;
    const showCheck = row.querySelector('.show-check');
    const showOrderInput = row.querySelector('.show-order-input');
    const copyCheck = row.querySelector('.copy-check');
    const orderInput = row.querySelector('.order-input');

    showCheck.addEventListener('change', () => {
      if (showCheck.checked) {
        const maxShowOrder = Math.max(0, ...Object.values(settingsFieldsConfig).map(fc => fc.showOrder));
        settingsFieldsConfig[field].show = true;
        settingsFieldsConfig[field].showOrder = maxShowOrder + 1;
        showOrderInput.value = maxShowOrder + 1;
      } else {
        const removedOrder = settingsFieldsConfig[field].showOrder;
        settingsFieldsConfig[field].show = false;
        settingsFieldsConfig[field].showOrder = 0;
        showOrderInput.value = 0;

        Object.keys(settingsFieldsConfig).forEach(f => {
          if (settingsFieldsConfig[f].showOrder > removedOrder) {
            settingsFieldsConfig[f].showOrder--;
          }
        });
        updateSettingsOrderInputs();
      }
    });

    copyCheck.addEventListener('change', () => {
      if (copyCheck.checked) {
        const maxOrder = Math.max(0, ...Object.values(settingsFieldsConfig).map(fc => fc.order));
        settingsFieldsConfig[field].copy = true;
        settingsFieldsConfig[field].order = maxOrder + 1;
        orderInput.value = maxOrder + 1;
      } else {
        const removedOrder = settingsFieldsConfig[field].order;
        settingsFieldsConfig[field].copy = false;
        settingsFieldsConfig[field].order = 0;
        orderInput.value = 0;

        Object.keys(settingsFieldsConfig).forEach(f => {
          if (settingsFieldsConfig[f].order > removedOrder) {
            settingsFieldsConfig[f].order--;
          }
        });
        updateSettingsOrderInputs();
      }
    });
  });
}

function updateSettingsOrderInputs() {
  fieldsTableBody.querySelectorAll('tr').forEach(row => {
    const field = row.dataset.field;
    const showOrderInput = row.querySelector('.show-order-input');
    const orderInput = row.querySelector('.order-input');
    showOrderInput.value = settingsFieldsConfig[field].showOrder;
    orderInput.value = settingsFieldsConfig[field].order;
  });
}

function initColorRules() {
  const { items, config } = currentState;
  if (items.length === 0) return;

  // Convert old format to new format if needed
  if (config.color_rules && Array.isArray(config.color_rules)) {
    colorRulesConfig = [...config.color_rules];
  } else if (config.color_field) {
    // Legacy single rule
    colorRulesConfig = [{
      field: config.color_field,
      operator: config.color_operator || '==',
      value: config.color_value || '',
      color: config.color_hex || '#ff6b6b'
    }];
  } else {
    colorRulesConfig = [];
  }

  renderColorRules();
}

function renderColorRules() {
  const { items } = currentState;
  if (items.length === 0) return;

  const fields = Object.keys(items[0]);

  colorRulesList.innerHTML = colorRulesConfig.map((rule, idx) => `
    <div class="color-rule" data-index="${idx}">
      <select class="rule-field">
        ${fields.map(f => `<option value="${f}" ${f === rule.field ? 'selected' : ''}>${f}</option>`).join('')}
      </select>
      <select class="rule-operator">
        <option value="==" ${rule.operator === '==' ? 'selected' : ''}>=</option>
        <option value="!=" ${rule.operator === '!=' ? 'selected' : ''}>≠</option>
        <option value="contains" ${rule.operator === 'contains' ? 'selected' : ''}>has</option>
      </select>
      <input type="text" class="rule-value" value="${escapeHtml(rule.value || '')}" placeholder="value">
      <input type="color" class="rule-color" value="${rule.color || '#ff6b6b'}">
      <button class="btn-remove-rule">×</button>
    </div>
  `).join('');

  // Event listeners for each rule
  colorRulesList.querySelectorAll('.color-rule').forEach(ruleEl => {
    const idx = parseInt(ruleEl.dataset.index);

    ruleEl.querySelector('.rule-field').addEventListener('change', (e) => {
      colorRulesConfig[idx].field = e.target.value;
    });
    ruleEl.querySelector('.rule-operator').addEventListener('change', (e) => {
      colorRulesConfig[idx].operator = e.target.value;
    });
    ruleEl.querySelector('.rule-value').addEventListener('input', (e) => {
      colorRulesConfig[idx].value = e.target.value;
    });
    ruleEl.querySelector('.rule-color').addEventListener('input', (e) => {
      colorRulesConfig[idx].color = e.target.value;
    });
    ruleEl.querySelector('.btn-remove-rule').addEventListener('click', () => {
      colorRulesConfig.splice(idx, 1);
      renderColorRules();
    });
  });
}

btnAddColorRule.addEventListener('click', () => {
  const { items } = currentState;
  if (items.length === 0) return;

  const fields = Object.keys(items[0]);
  colorRulesConfig.push({
    field: fields[0],
    operator: '==',
    value: '',
    color: '#ff6b6b'
  });
  renderColorRules();
});

async function saveSettingsConfig() {
  const displayFields = Object.entries(settingsFieldsConfig)
    .filter(([_, fc]) => fc.show && fc.showOrder > 0)
    .sort((a, b) => a[1].showOrder - b[1].showOrder)
    .map(([field]) => field);

  const copyFields = Object.entries(settingsFieldsConfig)
    .filter(([_, fc]) => fc.copy && fc.order > 0)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([field]) => field);

  // Filter out empty rules
  const validColorRules = colorRulesConfig.filter(r => r.field && r.value);

  const newConfig = {
    display_fields: displayFields,
    copy_fields: copyFields,
    auto_advance: autoAdvanceCheck.checked,
    color_rules: validColorRules
  };

  await ipcRenderer.invoke('update-config', newConfig);
}

// ============ Config Modal ============

function showConfigModal(availableArrays) {
  arraySelect.innerHTML = availableArrays.map(arr =>
    `<option value="${arr.key}">${arr.key === '__root__' ? '(root)' : arr.key} (${arr.count})</option>`
  ).join('');

  updateFieldsForArray(availableArrays[0]);
  configModal.style.display = 'flex';
}

function updateFieldsForArray(arrayInfo) {
  if (!arrayInfo || !arrayInfo.fields) return;

  const fields = arrayInfo.fields;
  modalFieldsConfig = {};

  fields.forEach((field, idx) => {
    modalFieldsConfig[field] = {
      show: true,
      showOrder: idx + 1,
      copy: idx === 0,
      order: idx === 0 ? 1 : 0
    };
  });

  modalFieldsTableBody.innerHTML = fields.map(field => {
    const fc = modalFieldsConfig[field];
    return `
      <tr data-field="${field}">
        <td class="field-name">${field}</td>
        <td><input type="checkbox" class="show-check" ${fc.show ? 'checked' : ''}></td>
        <td><input type="number" class="show-order-input" min="0" max="99" value="${fc.showOrder}" readonly></td>
        <td><input type="checkbox" class="copy-check" ${fc.copy ? 'checked' : ''}></td>
        <td><input type="number" class="order-input" min="0" max="99" value="${fc.order}" readonly></td>
      </tr>
    `;
  }).join('');

  modalFieldsTableBody.querySelectorAll('tr').forEach(row => {
    const field = row.dataset.field;
    const showCheck = row.querySelector('.show-check');
    const showOrderInput = row.querySelector('.show-order-input');
    const copyCheck = row.querySelector('.copy-check');
    const orderInput = row.querySelector('.order-input');

    showCheck.addEventListener('change', () => {
      if (showCheck.checked) {
        const maxShowOrder = Math.max(0, ...Object.values(modalFieldsConfig).map(fc => fc.showOrder));
        modalFieldsConfig[field].show = true;
        modalFieldsConfig[field].showOrder = maxShowOrder + 1;
        showOrderInput.value = maxShowOrder + 1;
      } else {
        const removedOrder = modalFieldsConfig[field].showOrder;
        modalFieldsConfig[field].show = false;
        modalFieldsConfig[field].showOrder = 0;
        showOrderInput.value = 0;

        Object.keys(modalFieldsConfig).forEach(f => {
          if (modalFieldsConfig[f].showOrder > removedOrder) {
            modalFieldsConfig[f].showOrder--;
          }
        });
        updateModalOrderInputs();
      }
    });

    copyCheck.addEventListener('change', () => {
      if (copyCheck.checked) {
        const maxOrder = Math.max(0, ...Object.values(modalFieldsConfig).map(fc => fc.order));
        modalFieldsConfig[field].copy = true;
        modalFieldsConfig[field].order = maxOrder + 1;
        orderInput.value = maxOrder + 1;
      } else {
        const removedOrder = modalFieldsConfig[field].order;
        modalFieldsConfig[field].copy = false;
        modalFieldsConfig[field].order = 0;
        orderInput.value = 0;

        Object.keys(modalFieldsConfig).forEach(f => {
          if (modalFieldsConfig[f].order > removedOrder) {
            modalFieldsConfig[f].order--;
          }
        });
        updateModalOrderInputs();
      }
    });
  });
}

function updateModalOrderInputs() {
  modalFieldsTableBody.querySelectorAll('tr').forEach(row => {
    const field = row.dataset.field;
    const showOrderInput = row.querySelector('.show-order-input');
    const orderInput = row.querySelector('.order-input');
    showOrderInput.value = modalFieldsConfig[field].showOrder;
    orderInput.value = modalFieldsConfig[field].order;
  });
}

arraySelect.addEventListener('change', (e) => {
  const selectedArray = pendingArrays.find(arr => arr.key === e.target.value);
  if (selectedArray) {
    updateFieldsForArray(selectedArray);
  }
});

btnApplyConfig.addEventListener('click', async () => {
  const selectedArray = arraySelect.value;

  const displayFields = Object.entries(modalFieldsConfig)
    .filter(([_, fc]) => fc.show && fc.showOrder > 0)
    .sort((a, b) => a[1].showOrder - b[1].showOrder)
    .map(([field]) => field);

  const copyFields = Object.entries(modalFieldsConfig)
    .filter(([_, fc]) => fc.copy && fc.order > 0)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([field]) => field);

  const copyField = copyFields.length > 0 ? copyFields[0] : Object.keys(modalFieldsConfig)[0];

  const userConfig = {
    array_path: selectedArray,
    copy_field: copyField,
    copy_fields: copyFields,
    display_fields: displayFields,
    auto_advance: false
  };

  const result = await ipcRenderer.invoke('apply-user-config', userConfig);

  if (result.success) {
    configModal.style.display = 'none';
    showCopiedFlash();
  } else {
    alert('Error: ' + result.error);
  }
});

btnCancelConfig.addEventListener('click', () => {
  configModal.style.display = 'none';
});

// ============ Main Render ============

ipcRenderer.on('update-index', (event, state) => {
  currentState = state;
  renderUI();
  showCopiedFlash();
});

function renderUI() {
  const { currentIndex, copyFieldIndex, total, items, config } = currentState;

  counter.textContent = `${currentIndex + 1}/${total}`;

  if (items.length > 0) {
    renderItemsList();
    renderCopyIndicator();
  } else {
    renderEmptyState();
    copyIndicator.style.display = 'none';
  }
}

function renderCopyIndicator() {
  const { currentIndex, copyFieldIndex, items, config } = currentState;
  const copyFields = config.copy_fields || (config.copy_field ? [config.copy_field] : []);

  if (copyFields.length > 0 && items.length > 0) {
    copyIndicator.style.display = 'flex';

    // Current value
    const currentField = copyFields[copyFieldIndex] || copyFields[0];
    const currentVal = items[currentIndex]?.[currentField] || '';
    copyCurrentValue.textContent = String(currentVal);
    copyCurrentValue.title = `${currentField}: ${currentVal}`;
    copyCurrentLabel.textContent = `${copyFieldIndex + 1}/${copyFields.length}`;

    // Next value
    let nextVal = null;
    let nextField = null;

    if (copyFieldIndex < copyFields.length - 1) {
      // Next field in same item
      nextField = copyFields[copyFieldIndex + 1];
      nextVal = items[currentIndex]?.[nextField];
    } else if (currentIndex < items.length - 1) {
      // First field of next item
      nextField = copyFields[0];
      nextVal = items[currentIndex + 1]?.[nextField];
    }

    if (nextVal !== null && nextVal !== undefined) {
      copyNextDiv.style.display = 'flex';
      copyNextValue.textContent = truncate(String(nextVal), 40);
      copyNextValue.title = `${nextField}: ${nextVal}`;
    } else {
      copyNextDiv.style.display = 'none';
    }
  } else {
    copyIndicator.style.display = 'none';
  }
}

function checkColorRules(item, colorRules) {
  for (const rule of colorRules) {
    if (!rule.field || !rule.value) continue;

    const itemValue = item[rule.field];
    const itemStr = String(itemValue || '');
    const ruleValue = rule.value;

    let matches = false;
    switch (rule.operator) {
      case '==':
        matches = itemStr === ruleValue || itemStr.toLowerCase() === ruleValue.toLowerCase();
        break;
      case '!=':
        matches = itemStr !== ruleValue && itemStr.toLowerCase() !== ruleValue.toLowerCase();
        break;
      case 'contains':
        matches = itemStr.toLowerCase().includes(ruleValue.toLowerCase());
        break;
    }

    if (matches) {
      return rule.color || '#ff6b6b';
    }
  }
  return null;
}

function renderItemsList() {
  const { currentIndex, copyFieldIndex, items, config } = currentState;
  const displayFields = config.display_fields || [];
  const copyFields = config.copy_fields || (config.copy_field ? [config.copy_field] : []);
  const colorRules = config.color_rules || [];

  let html = '';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let rowClass = 'item-row';

    if (i < currentIndex) rowClass += ' past';
    else if (i === currentIndex) rowClass += ' current';
    else rowClass += ' future';

    // Check color rules - apply to index box
    const matchedColor = checkColorRules(item, colorRules);
    const indexStyle = matchedColor ? `style="background: ${matchedColor}; color: white;"` : '';

    // Principal field (first display field)
    const fieldsToShow = displayFields.length > 0 ? displayFields : Object.keys(item).slice(0, 3);
    const principalValue = item[fieldsToShow[0]] || '';

    // Secondary fields
    let secondaryHtml = '';
    if (fieldsToShow.length > 1) {
      secondaryHtml = `<div class="item-fields">`;
      for (let j = 1; j < fieldsToShow.length; j++) {
        const field = fieldsToShow[j];
        const value = item[field];
        if (value !== null && value !== undefined) {
          secondaryHtml += `<span class="item-field">${escapeHtml(String(value))}</span>`;
        }
      }
      secondaryHtml += `</div>`;
    }

    // Copy values in full-width boxes
    let copyBoxesHtml = '';
    if (copyFields.length === 1) {
      // Single copy field - one box
      const value = item[copyFields[0]] || '';
      copyBoxesHtml = `<div class="copy-value-box" title="${copyFields[0]}">${escapeHtml(String(value))}</div>`;
    } else if (copyFields.length > 1) {
      // Multiple copy fields - list of boxes
      copyBoxesHtml = `<div class="copy-values-list">`;
      copyFields.forEach((field, idx) => {
        const value = item[field] || '';
        const activeClass = (i === currentIndex && idx === copyFieldIndex) ? 'active' : '';
        copyBoxesHtml += `<div class="copy-value-item ${activeClass}" title="${field}">${escapeHtml(String(value))}</div>`;
      });
      copyBoxesHtml += `</div>`;
    }

    html += `
      <div class="${rowClass}" data-index="${i}">
        <div class="item-index" ${indexStyle}>#${i + 1}</div>
        <div class="item-content">
          <div class="item-principal">${escapeHtml(String(principalValue))}</div>
          ${secondaryHtml}
          ${copyBoxesHtml}
        </div>
      </div>
    `;
  }

  itemsList.innerHTML = html;

  // Click handlers
  itemsList.querySelectorAll('.item-row[data-index]').forEach(row => {
    row.addEventListener('click', async () => {
      const index = parseInt(row.dataset.index, 10);
      await ipcRenderer.invoke('set-index', index);
    });
  });

  // Auto-scroll
  const currentRow = itemsList.querySelector('.item-row.current');
  if (currentRow) {
    currentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function renderEmptyState() {
  itemsList.innerHTML = `
    <div class="empty-state">
      <p>Click <span class="icon-hint">↑</span> to load JSON</p>
      <p class="shortcut-hint">Ctrl+↑↓ rows | Ctrl+←→ fields | Ctrl+Space</p>
    </div>
  `;
}

function showCopiedFlash() {
  const currentRow = itemsList.querySelector('.item-row.current');
  if (currentRow) {
    currentRow.classList.add('copied-flash');
    setTimeout(() => {
      currentRow.classList.remove('copied-flash');
    }, 300);
  }
}

// Utilities
function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load saved preferences
function loadPreferences() {
  // Dark mode
  const darkMode = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark', darkMode);
  darkModeCheck.checked = darkMode;

  // Font size
  const savedFontSize = localStorage.getItem('fontSize');
  if (savedFontSize) {
    currentFontSize = parseInt(savedFontSize);
    applyFontSize();
  }
}

loadPreferences();

// Initial render
renderUI();
