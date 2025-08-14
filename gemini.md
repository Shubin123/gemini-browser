# Browser Control Interface

You can control a browser using !browser commands. Simply state the commands in your response.

## Available Commands
### PLEASE FORMAT WITH NEWLINE ON EACH COMMAND
### Navigation
- `!browser navigate [url]` - Navigate to a URL

### Interaction  
- `!browser click [selector]` - Click an element using CSS selector
- `!browser input [selector] [text]` - Input text into an element
- `!browser action [actionIndex] [actionType] [inputValue]` - Perform action on element by index

### Inspection
- `!browser get [selector]` - Get element details using CSS selector
- `!browser screenshot` - Take a full page screenshot
- `!browser observe` - Get comprehensive page observation with interactive elements
- `!browser annotated-screenshot` - Take screenshot with element annotations
- `!browser action-space` - List all actionable elements with indices

### JavaScript Execution
- `!browser evaluate [js-code]` - Execute JavaScript code in the page context

## Usage Rules

**IMPORTANT**: Only output the raw !browser commands - no code blocks, backticks, or formatting
- Use CSS selectors for elements (#id, .class, tag)
- Chain commands by stating them sequentially on separate lines
- `input` command automatically triggers input and change events
- `get` returns element details (tag, id, class, text, attributes, bounding rect)
- `screenshot` saves PNG to temp directory and returns file path
- Do not wrap commands in markdown, quotes, or any special characters

## Advanced Action System

### Element-Based Actions
The browser maintains an indexed list of actionable elements. Use these commands for precise interaction:

- `!browser observe` - Returns page observation with all interactive elements
- `!browser action-space` - Get summary of actionable elements with their indices
- `!browser action [index] click` - Click element at specific index
- `!browser action [index] type [text]` - Type text into input element at index
- `!browser action [index] select [value]` - Select option in dropdown at index

### Observation Data Structure
`!browser observe` returns:
```
{
  url: current page URL,
  title: page title,
  elements: [
    {
      index: element index for actions,
      tag: HTML tag name,
      text: visible text content (first 100 chars),
      attributes: { id, class, type, href, role },
      bounds: { x, y, width, height }
    }
  ]
}
```

### Action Space Structure  
`!browser action-space` returns:
```
{
  total_actions: number of actionable elements,
  action_types: {
    clickable: count of clickable elements,
    inputs: count of input fields,
    selects: count of dropdown selects
  },
  elements: [
    {
      index: action index,
      type: 'click'|'type'|'select',
      description: element description,
      tag_name: HTML tag,
      bounding_box: { x, y, width, height }
    }
  ]
}
```

### Annotated Screenshots
`!browser annotated-screenshot` returns:
```
{
  screenshot: base64 encoded image,
  observation: complete page observation data,
  timestamp: capture timestamp
}
```

## Action Types

1. **click** - For buttons, links, checkboxes, radio buttons, clickable elements
2. **type** - For text inputs, textareas, password fields  
3. **select** - For dropdown select elements

## Example Workflows

### Basic Navigation and Interaction
### PLEASE FORMAT WITH NEWLINE ON EACH COMMAND
```
!browser navigate https://example.com
!browser click .login-button
!browser input #username john@example.com
!browser input #password mypassword
!browser click input[type="submit"]
```

### Advanced Element-Based Interaction
```
!browser navigate https://example.com
!browser observe
!browser action-space
!browser action 5 click
!browser action 12 type "search query"
!browser action 8 select "option-value"
```

### Inspection and Analysis
```
!browser screenshot
!browser get h1
!browser evaluate document.title
!browser annotated-screenshot
```

## Action Space Integration

- Elements are automatically indexed based on visibility and interactivity
- Actionable elements include: buttons, links, inputs, selects, clickable elements
- Use `observe` to understand page structure before taking actions
- Use `action-space` to see all available interaction points
- Use `action [index] [type] [value]` for precise element targeting

**Action Space**: navigate, click, input, get, screenshot(SAVED IN /tmp), evaluate, observe, annotated-screenshot(DONT USE), action-space, action

**Observation Space**: Frame buffer, element details from `get`, comprehensive page data from `observe`, annotated screenshots with element mapping, and actionable element indices from `action-space`

ACTION: go to cnn and get all button information. respond clearly with information on these buttons
ACTION: go on youtube, get all available elems look at said elems and determine which to click to get into a video
