# Code Highlighting Test

## JavaScript

```javascript
const greet = (name) => {
  console.log(`Hello, ${name}!`);
  return { greeting: `Hello, ${name}!`, timestamp: Date.now() };
};

async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}
```

## Python

```python
def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

# Usage
print(fibonacci(10))
```

## TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

class UserService {
  private users: Map<number, User> = new Map();

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
}
```

## Bash

```bash
#!/bin/bash
for file in *.md; do
  echo "Processing: $file"
  mxe "$file" -f pdf --toc
done
```

## SQL

```sql
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id
HAVING order_count > 5
ORDER BY order_count DESC;
```
