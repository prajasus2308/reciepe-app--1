
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserPreferences } from "../types";

// Fix: Strictly following the SDK guideline to use process.env.API_KEY directly and instantiate inside functions.

export const generateRecipe = async (prefs: UserPreferences): Promise<Recipe> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Generate a high-quality recipe based on these preferences:
    Ingredients available: ${prefs.ingredients.join(", ")}
    Dietary restrictions: ${prefs.diet}
    Preferred cuisine: ${prefs.cuisine}
    Complexity level: ${prefs.complexity}
    
    Ensure the recipe is creative, delicious, and follows the specified constraints.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          prepTime: { type: Type.STRING },
          cookTime: { type: Type.STRING },
          servings: { type: Type.NUMBER },
          difficulty: { type: Type.STRING },
          cuisine: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                amount: { type: Type.STRING }
              },
              required: ["item", "amount"]
            }
          },
          instructions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          nutrition: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER }
            },
            required: ["calories", "protein", "carbs", "fat"]
          }
        },
        required: ["name", "description", "prepTime", "cookTime", "servings", "difficulty", "ingredients", "instructions", "nutrition", "cuisine"]
      }
    }
  });

  // Fix: Handling potential undefined text property as per documentation
  const responseText = response.text;
  if (!responseText) {
    throw new Error("The model did not return any recipe content.");
  }

  const recipeData = JSON.parse(responseText.trim());
  return {
    ...recipeData,
    id: Math.random().toString(36).substr(2, 9)
  };
};

export const generateRecipeImage = async (recipeName: string, cuisine: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `A professional food photography shot of ${recipeName}, a ${cuisine} dish. High-end plating, soft natural lighting, rustic table setting, shallow depth of field, 4k resolution.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  // Fix: Iterating through parts as required for nano banana series models, with safety checks for candidates.
  if (response.candidates && response.candidates.length > 0) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  return "https://picsum.photos/800/800"; // Fallback
};
