import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFF9F0",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 100 100">
          <path
            d="M50 8 L92 88 Q92 94 84 94 L16 94 Q8 94 8 88 Z"
            fill="#FFFDF7"
            stroke="#5C4632"
            strokeWidth="7"
          />
          <rect x="8" y="70" width="84" height="22" fill="#5C4632" opacity="0.85" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
