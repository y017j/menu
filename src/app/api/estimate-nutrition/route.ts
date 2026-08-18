import { NextRequest, NextResponse } from "next/server";

// レシピ登録時に呼ばれるAIカロリー推定API(■C対応)。
// コストを抑えるため、現行モデルの中で最安のHaiku 4.5を使用する(■12)。
const MODEL = "claude-haiku-4-5-20251001";

interface Ingredient {
  name: string;
  quantityText: string | null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { name, baseServings, ingredients } = body as {
    name: string;
    baseServings: number;
    ingredients: Ingredient[];
  };

  const ingredientLines = ingredients
    .map((i) => `- ${i.name} ${i.quantityText ?? ""}`.trim())
    .join("\n");

  const prompt = `あなたは栄養士です。以下の料理について、1人前あたりの推定カロリー・栄養情報を計算してください。
分量が不明な材料は一般的な分量を仮定してください。

料理名: ${name}
基準人数: ${baseServings}人分
材料:
${ingredientLines || "(材料未入力。料理名から一般的な材料構成を仮定してください)"}

以下のJSON形式のみを出力してください。前置きや説明、Markdownのコードブロック記法は一切不要です。
{"calories_kcal": 数値, "protein_g": 数値, "fat_g": 数値, "carbs_g": 数値}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `AI呼び出しに失敗しました: ${text}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const textBlock = data.content?.find((c: { type: string }) => c.type === "text");
  const raw = textBlock?.text ?? "";

  let parsed: {
    calories_kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "AIの応答をJSONとして解釈できませんでした", raw },
      { status: 502 }
    );
  }

  return NextResponse.json({ ...parsed, ai_model: MODEL });
}
