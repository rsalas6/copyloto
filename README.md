# CopyLoto

Overlay app for sequential JSON data copying. Load a JSON file and copy values one by one with keyboard shortcuts.

## Installation

```bash
npm install -g copyloto
```

## Usage

```bash
copyloto
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Up` | Previous row |
| `Ctrl+Down` | Next row |
| `Ctrl+Left` | Previous field |
| `Ctrl+Right` | Next field |
| `Ctrl+Space` | Copy current value and advance |

### Loading Data

1. Click the upload icon or press the load button
2. Choose to open a JSON file or paste JSON directly
3. Configure which fields to display and copy

### Settings

- Dark mode
- Opacity control
- Font size adjustment
- Field visibility and copy order

## JSON Format

Works with any JSON array:

```json
[
  { "id": 1, "name": "Item 1", "value": "abc" },
  { "id": 2, "name": "Item 2", "value": "def" }
]
```

Or nested structures - select the array path in settings.

## License

MIT
