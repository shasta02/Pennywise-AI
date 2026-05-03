import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

export const extractTransactionsFromPDF = async (base64Data: string): Promise<ExtractedTransaction[]> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Extract all individual transactions from this bank statement.
    Return only a JSON array of objects with the following schema:
    - date: String (YYYY-MM-DD)
    - description: String
    - amount: Number (negative for expenses/withdrawals, positive for deposits/income)
    - category: String (one of: Food, Transport, Utilities, Entertainment, Income, Shopping, Transfer, Other)

    Special Instructions:
    - Identify credit card payments, autopayments for statements, or balance payoffs.
    - Categorize these as "Transfer" rather than "Other" or "Shopping".
    - These are usually descriptions like "AUTOPAY PAYMENT", "PAYMENT TO CREDIT CARD", "MOBILE PAYMENT", etc.

    If a date is ambiguous, assume the year of the statement (if missing, use 2025).
    Ensure the JSON is valid and contains no extra text or markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              category: { type: Type.STRING }
            },
            required: ["date", "description", "amount", "category"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    return JSON.parse(text) as ExtractedTransaction[];
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};

export async function categorizeTransactions(transactionNames: string[]) {
  const prompt = `Categorize the following transaction names into standard budget categories (e.g., Food & Drink, Transportation, Shopping, Entertainment, Utilities, Rent/Mortgage, Health/Fitness, Travel, Income, Other).
  
  Transactions:
  ${transactionNames.join('\n')}
  
  Return a JSON object where keys are the original transaction names and values are the categories.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          additionalProperties: { type: Type.STRING }
        }
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Gemini Categorization Error:', error);
    return {};
  }
}
