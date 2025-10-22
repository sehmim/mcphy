# Examples

Real-world examples of MCPhy in action.

## Pet Store API

```bash
# Use the included example
cd examples
mcphy init -f sample-swagger.yaml
mcphy serve
```

Try these queries:
- "Show me all pets"
- "Create a new pet named Max"
- "Get pet with ID 1"
- "Delete pet 2"

## E-commerce API

```bash
# Initialize with your API
mcphy init -f ecommerce-api.yaml
mcphy serve
```

Example queries:
- "Get all products under $50"
- "Create order for customer john@example.com"
- "Update product 123 with new price 29.99"
- "Get orders for last 30 days"

## Booking System

```bash
mcphy init -f booking-api.yaml
mcphy serve
```

Example queries:
- "Create booking for John Doe for oil change for 2025-01-15"
- "Get all bookings for garage way/123456"
- "Update booking status to confirmed"
- "Cancel booking with ID booking-123"

## What Makes These Examples Interesting

### 🧠 **Smart Parameter Extraction**
MCPhy understands natural language and extracts structured data:
```
"Create booking for John Doe for oil change for 2025-01-15"
↓
{
  "customer_name": "John Doe",
  "service_type": "oil change", 
  "appointment_date": "2025-01-15"
}
```

### ⚠️ **Missing Information Detection**
When you ask incomplete questions, MCPhy helps:
```
You: "create booking"

MCPhy: ⚠️ Missing required fields:
       • garage_id (e.g., "for garage way/123456")
       • customer_name (e.g., "for John Doe")
       • service_type (e.g., "for oil change")
       • appointment_date (e.g., "for 2025-01-15")
```

### 🔌 **Real API Calls**
MCPhy doesn't just match queries - it makes actual HTTP requests:
```
You: "get all users"
MCPhy: 📤 GET http://your-api.com/users
       📋 Response: [{"id": 1, "name": "John"}, ...]
```

## Try It Yourself

1. **Clone the repo:**
   ```bash
   git clone https://github.com/sehmim/mcphy.git
   cd mcphy
   ```

2. **Install and run:**
   ```bash
   npm install
   npm run build
   npm link
   ```

3. **Test with examples:**
   ```bash
   cd examples
   mcphy init -f sample-swagger.yaml
   mcphy serve
   ```

4. **Open browser:**
   Visit `http://localhost:3000` and start chatting!

## Why Developers Love This

- **Zero Code Changes** - Works with existing APIs
- **Natural Language** - No need to remember endpoint names
- **Real Responses** - Actually calls your backend
- **Smart Guidance** - Helps when information is missing
- **Beautiful UI** - Professional chat interface
- **Easy Export** - Create standalone packages
