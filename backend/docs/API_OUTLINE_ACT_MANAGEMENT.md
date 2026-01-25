# Outline Act Management API

This document describes the new API endpoints for managing acts within story outlines.

## Endpoints

### 1. Regenerate a Specific Act

**POST** `/api/outlines/:bookId/regenerate-act/:actNumber`

Regenerates a single act while keeping other acts intact. Uses context from the project's Story DNA and Story Bible.

#### Path Parameters
- `bookId` (string, UUID): The ID of the book
- `actNumber` (number): The act number to regenerate (1-indexed)

#### Response (200 OK)
```json
{
  "success": true,
  "act": {
    "number": 1,
    "name": "Act One: The Beginning",
    "description": "The protagonist's ordinary world is established...",
    "beats": [
      {
        "name": "Opening Image",
        "description": "We see the protagonist in their normal life",
        "percentagePoint": 0
      }
    ],
    "targetWordCount": 20000,
    "chapters": [
      {
        "number": 1,
        "title": "Chapter Title",
        "summary": "Chapter summary",
        "actNumber": 1,
        "povCharacter": "Character Name",
        "wordCountTarget": 2000,
        "scenes": []
      }
    ]
  },
  "totalChapters": 30
}
```

#### Error Responses
- **400 Bad Request**: Invalid act number or act does not exist
- **404 Not Found**: Outline, book, or project not found
- **500 Internal Server Error**: Server error during regeneration

#### Notes
- Requires valid Story DNA and Story Bible in the project
- Automatically renumbers chapters sequentially after regeneration
- Maintains continuity with other acts

---

### 2. Delete All Acts

**DELETE** `/api/outlines/:bookId/acts`

Deletes all acts from the outline and resets it to an empty state. Also deletes all associated chapters from the database.

#### Path Parameters
- `bookId` (string, UUID): The ID of the book

#### Response (200 OK)
```json
{
  "success": true,
  "message": "All acts deleted"
}
```

#### Error Responses
- **404 Not Found**: Outline not found for this book
- **500 Internal Server Error**: Server error during deletion

#### Notes
- Permanently deletes all chapter records for the book
- Resets the outline structure to empty (acts: [])
- Cannot be undone - use with caution

---

### 3. Delete a Specific Act

**DELETE** `/api/outlines/:bookId/acts/:actNumber`

Deletes a specific act and renumbers the remaining acts. Also deletes associated chapters and renumbers remaining chapters sequentially.

#### Path Parameters
- `bookId` (string, UUID): The ID of the book
- `actNumber` (number): The act number to delete (1-indexed)

#### Response (200 OK)
```json
{
  "success": true,
  "structure": {
    "type": "three_act",
    "acts": [
      {
        "number": 1,
        "name": "Act One",
        "description": "...",
        "beats": [...],
        "targetWordCount": 20000,
        "chapters": [...]
      }
    ]
  },
  "totalChapters": 20
}
```

#### Error Responses
- **400 Bad Request**: Invalid act number or act does not exist
- **404 Not Found**: Outline not found for this book
- **500 Internal Server Error**: Server error during deletion

#### Notes
- Automatically renumbers remaining acts (e.g., Act 3 becomes Act 2 if Act 1 is deleted)
- Automatically renumbers all chapters sequentially
- Updates chapter `actNumber` references
- Permanently deletes chapter records - cannot be undone

---

### 4. Update Act Content

**PUT** `/api/outlines/:bookId/acts/:actNumber`

Updates an act's content without regenerating it. Allows manual editing of act properties.

#### Path Parameters
- `bookId` (string, UUID): The ID of the book
- `actNumber` (number): The act number to update (1-indexed)

#### Request Body
```json
{
  "name": "Updated Act Name",
  "description": "Updated description of what happens in this act",
  "beats": [
    {
      "name": "Beat Name",
      "description": "Beat description",
      "percentagePoint": 25
    }
  ],
  "targetWordCount": 25000,
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "summary": "Chapter summary",
      "actNumber": 1,
      "beatName": "Opening",
      "povCharacter": "Character Name",
      "wordCountTarget": 2000,
      "scenes": []
    }
  ]
}
```

All fields are optional. Only provided fields will be updated.

#### Response (200 OK)
```json
{
  "success": true,
  "act": {
    "number": 1,
    "name": "Updated Act Name",
    "description": "Updated description",
    "beats": [...],
    "targetWordCount": 25000,
    "chapters": [...]
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid act number or act does not exist
- **404 Not Found**: Outline not found for this book
- **500 Internal Server Error**: Server error during update

#### Notes
- Does not regenerate content - just saves user edits
- If `chapters` array is updated, automatically renumbers all chapters in all acts
- Updates `actNumber` references in chapters if structure changes

---

## Usage Examples

### Regenerate Act 2 after editing Story Bible

```javascript
const response = await fetch('/api/outlines/book-123/regenerate-act/2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

const { success, act, totalChapters } = await response.json();
console.log(`Regenerated Act ${act.number} with ${act.chapters.length} chapters`);
```

### Delete all acts to start fresh

```javascript
const response = await fetch('/api/outlines/book-123/acts', {
  method: 'DELETE'
});

const { success, message } = await response.json();
console.log(message); // "All acts deleted"
```

### Delete Act 1 and renumber remaining acts

```javascript
const response = await fetch('/api/outlines/book-123/acts/1', {
  method: 'DELETE'
});

const { success, structure, totalChapters } = await response.json();
console.log(`Now have ${structure.acts.length} acts and ${totalChapters} chapters`);
```

### Update Act 3's description manually

```javascript
const response = await fetch('/api/outlines/book-123/acts/3', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: "The final confrontation where the hero faces their greatest fear"
  })
});

const { success, act } = await response.json();
console.log(`Updated Act ${act.number}: ${act.name}`);
```

---

## Integration Notes

### Frontend Implementation Checklist

- [ ] Add "Regenerate Act" button to each act card
- [ ] Add "Delete Act" button with confirmation dialog
- [ ] Add "Delete All Acts" button with strong warning
- [ ] Add inline editing for act properties (name, description, etc.)
- [ ] Show loading state during regeneration (can take 10-30 seconds)
- [ ] Refresh outline display after any act operation
- [ ] Handle error states gracefully with user-friendly messages
- [ ] Add undo/redo support (optional, requires additional endpoints)

### Performance Considerations

- **Regeneration**: Takes 10-30 seconds depending on act size
- **Deletion**: Fast (< 100ms typically)
- **Update**: Fast (< 100ms typically)
- All operations update the `updated_at` timestamp on the outline

### Error Handling

All endpoints follow the standard error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `INVALID_INPUT`: Bad request parameters
- `NOT_FOUND`: Resource not found
- `INVALID_STATE`: Missing required data (Story DNA, Story Bible)
- `INTERNAL_ERROR`: Server error

---

## Testing

### Manual Testing Steps

1. **Setup**:
   - Create a project with Story DNA and Story Bible
   - Create a book in the project
   - Generate an initial outline with multiple acts

2. **Test Regenerate Act**:
   ```bash
   curl -X POST http://localhost:3000/api/outlines/{bookId}/regenerate-act/1
   ```
   - Verify Act 1 has new content
   - Verify other acts remain unchanged
   - Verify chapters are renumbered correctly

3. **Test Update Act**:
   ```bash
   curl -X PUT http://localhost:3000/api/outlines/{bookId}/acts/1 \
     -H "Content-Type: application/json" \
     -d '{"name": "Updated Act Name"}'
   ```
   - Verify act name updated
   - Verify other properties unchanged

4. **Test Delete Specific Act**:
   ```bash
   curl -X DELETE http://localhost:3000/api/outlines/{bookId}/acts/2
   ```
   - Verify Act 2 is gone
   - Verify remaining acts renumbered (Act 3 → Act 2)
   - Verify chapters renumbered correctly

5. **Test Delete All Acts**:
   ```bash
   curl -X DELETE http://localhost:3000/api/outlines/{bookId}/acts
   ```
   - Verify all acts removed
   - Verify outline structure is empty

### Integration with Existing Endpoints

These endpoints work alongside existing outline endpoints:

- `GET /api/outlines/book/:bookId` - Get current outline
- `POST /api/outlines/generate` - Generate initial outline
- `PUT /api/outlines/:id` - Update entire outline structure
- `POST /api/outlines/:id/start-generation` - Begin chapter generation

---

## Database Impact

### Tables Modified

**outlines**
- `structure` (JSON): Updated with new/modified act data
- `total_chapters` (INTEGER): Updated after act changes
- `updated_at` (TEXT): Updated on any modification

**chapters**
- Rows deleted when acts are deleted
- `chapter_number` updated when acts are renumbered
- `act_number` (if stored in scene_cards) updated

### Transaction Safety

All operations are atomic:
- Delete operations remove chapters before updating outline
- Update operations use database transactions (where applicable)
- Regeneration failures leave outline unchanged

---

## Future Enhancements

Potential additions in later phases:

- `POST /api/outlines/:bookId/acts/:actNumber/reorder` - Change act order
- `POST /api/outlines/:bookId/acts/:actNumber/duplicate` - Copy an act
- `GET /api/outlines/:bookId/acts/:actNumber/history` - View act revision history
- `POST /api/outlines/:bookId/acts/:actNumber/restore` - Restore previous version

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify Story DNA and Story Bible exist before regeneration
- Ensure Claude API key is configured correctly
- Check that the outline exists before trying to modify acts
