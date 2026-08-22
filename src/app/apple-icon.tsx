import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <svg width="132" height="132" viewBox="0 0 100 100">
          <path
            d="M50 8 L92 88 Q92 94 84 94 L16 94 Q8 94 8 88 Z"
            fill="#FFFDF7"
            stroke="#5C4632"
            strokeWidth="5"
          />
          <rect x="8" y="70" width="84" height="22" fill="#5C4632" opacity="0.85" />
          <circle cx="38" cy="58" r="4" fill="#5C4632" />
          <circle cx="62" cy="58" r="4" fill="#5C4632" />
          <circle cx="34" cy="67" r="4.5" fill="#FFB4C6" opacity="0.8" />
          <circle cx="66" cy="67" r="4.5" fill="#FFB4C6" opacity="0.8" />
          <path
            d="M42 64 Q50 71 58 64"
            stroke="#5C4632"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
