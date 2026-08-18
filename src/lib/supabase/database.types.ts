// schema.sql に対応する最小限の型定義。
// 本来は `supabase gen types typescript` で自動生成するのが望ましいが、
// このプロジェクトでは手書きで用意している（手順書の「型生成」の章を参照）。

export type IngredientType = "食材" | "調味料";
export type ContentType = "recipe" | "eat_out" | "free_text";
export type MealSlot = "朝" | "昼" | "夜";
export type CookReluctance = "普通" | "あまり料理したくない" | "絶対料理したくない";

export interface NutritionSnapshot {
  calories_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
}

export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          photo_url: string | null;
          description: string | null;
          category: string | null;
          cook_time_minutes: number | null;
          difficulty: string | null;
          base_servings: number;
          instructions: string | null;
          memo: string | null;
          is_favorite: boolean;
          is_quick_menu: boolean;
          last_cooked_at: string | null;
          cooked_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["recipes"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Row"]>;
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          name: string;
          quantity_text: string | null;
          is_optional: boolean;
          ingredient_type: IngredientType;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["recipe_ingredients"]["Row"]> & {
          recipe_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_ingredients"]["Row"]>;
      };
      recipe_nutrition: {
        Row: {
          recipe_id: string;
          calories_kcal: number | null;
          protein_g: number | null;
          fat_g: number | null;
          carbs_g: number | null;
          estimated_at: string;
          ai_model: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["recipe_nutrition"]["Row"]> & {
          recipe_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_nutrition"]["Row"]>;
      };
      day_settings: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          cook_reluctance: CookReluctance;
          note: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["day_settings"]["Row"]> & {
          user_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["day_settings"]["Row"]>;
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          meal_slot: MealSlot;
          content_type: ContentType;
          recipe_id: string | null;
          eat_out_option_id: string | null;
          free_text_label: string | null;
          servings: number | null;
          nutrition_snapshot: NutritionSnapshot | null;
          source: "manual" | "ai_generated";
          ai_plan_history_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_plans"]["Row"]> & {
          user_id: string;
          date: string;
          content_type: ContentType;
        };
        Update: Partial<Database["public"]["Tables"]["meal_plans"]["Row"]>;
      };
      meal_records: {
        Row: {
          id: string;
          user_id: string;
          meal_plan_id: string | null;
          date: string;
          meal_slot: MealSlot;
          content_type: ContentType;
          recipe_id: string | null;
          eat_out_option_id: string | null;
          free_text_label: string | null;
          nutrition_snapshot: NutritionSnapshot | null;
          comment: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_records"]["Row"]> & {
          user_id: string;
          date: string;
          content_type: ContentType;
        };
        Update: Partial<Database["public"]["Tables"]["meal_records"]["Row"]>;
      };
      meal_photos: {
        Row: {
          id: string;
          meal_record_id: string;
          photo_url: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_photos"]["Row"]> & {
          meal_record_id: string;
          photo_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_photos"]["Row"]>;
      };
      eat_out_options: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          genre: string | null;
          memo: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["eat_out_options"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["eat_out_options"]["Row"]>;
      };
      shopping_lists: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          status: "active" | "archived";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shopping_lists"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["shopping_lists"]["Row"]>;
      };
      shopping_items: {
        Row: {
          id: string;
          shopping_list_id: string;
          name: string;
          amount: number | null;
          unit: string | null;
          category_id: string | null;
          is_checked: boolean;
          source: "auto_from_recipe" | "manual";
          source_recipe_id: string | null;
          created_at: string;
          checked_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["shopping_items"]["Row"]> & {
          shopping_list_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["shopping_items"]["Row"]>;
      };
      shopping_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["shopping_categories"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["shopping_categories"]["Row"]>;
      };
    };
  };
}
