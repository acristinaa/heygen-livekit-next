export async function askLLM(message: string): Promise<string> {
    const res = await fetch("/api/ask", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    return data.answer as string;
  }
  