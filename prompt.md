# CopyLoto JSON Generator Prompt

Use this prompt with any LLM to generate JSON files compatible with CopyLoto.

---

## Prompt

```
Generate a JSON file for CopyLoto with the following structure:

1. Include a "copyloto_config" object with:
   - "array_path": the key name of the data array
   - "display_fields": array of field names to show in the UI
   - "copy_fields": array of field names to copy (in sequence order)

2. Include the data array with your items

Example format:
{
  "copyloto_config": {
    "array_path": "items",
    "display_fields": ["label"],
    "copy_fields": ["value1", "value2"]
  },
  "items": [
    { "label": "Item 1", "value1": "abc", "value2": "123" },
    { "label": "Item 2", "value1": "def", "value2": "456" }
  ]
}

Now generate a JSON for: [YOUR DATA DESCRIPTION HERE]
```

---

## Examples

### Example 1: User credentials list

**Request:**
```
Generate a JSON for: A list of 5 test users with username, email, and password
```

**Output:**
```json
{
  "copyloto_config": {
    "array_path": "users",
    "display_fields": ["username"],
    "copy_fields": ["email", "password"]
  },
  "users": [
    { "username": "john_doe", "email": "john@example.com", "password": "Pass123!" },
    { "username": "jane_smith", "email": "jane@example.com", "password": "Secret456" }
  ]
}
```

### Example 2: Form fill data

**Request:**
```
Generate a JSON for: Product entries with name, SKU, price, and description to fill in a form
```

**Output:**
```json
{
  "copyloto_config": {
    "array_path": "products",
    "display_fields": ["name", "sku"],
    "copy_fields": ["name", "sku", "price", "description"]
  },
  "products": [
    {
      "name": "Widget Pro",
      "sku": "WGT-001",
      "price": "29.99",
      "description": "Professional grade widget"
    }
  ]
}
```

### Example 3: Search queries

**Request:**
```
Generate a JSON for: Search queries to test in a search engine, showing the category and copying the query
```

**Output:**
```json
{
  "copyloto_config": {
    "array_path": "searches",
    "display_fields": ["category"],
    "copy_fields": ["query"]
  },
  "searches": [
    { "category": "Electronics", "query": "best wireless headphones 2024" },
    { "category": "Books", "query": "top sci-fi novels" }
  ]
}
```

---

## Tips

- **display_fields**: Choose fields that help you identify each row at a glance
- **copy_fields**: Order them in the sequence you'll paste them (use Ctrl+Space to advance)
- Keep field names simple and consistent
- The config is optional - you can always configure manually in the app
