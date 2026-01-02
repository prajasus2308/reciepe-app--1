
export interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  ingredients: {
    item: string;
    amount: string;
  }[];
  instructions: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  image?: string;
  cuisine: string;
}

export interface UserPreferences {
  ingredients: string[];
  diet: string;
  cuisine: string;
  complexity: string;
}
