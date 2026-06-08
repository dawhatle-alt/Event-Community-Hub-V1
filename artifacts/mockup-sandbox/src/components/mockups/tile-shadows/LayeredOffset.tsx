const TILES = [
  "/__mockup/images/tile1.jpg",
  "/__mockup/images/tile2.jpg",
  "/__mockup/images/tile3.jpg",
  "/__mockup/images/tile4.jpg",
  "/__mockup/images/tile5.jpg",
  "/__mockup/images/tile6.jpg",
];

export function LayeredOffset() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#181D37", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", gap: 24 }}>
      <p style={{ color: "#C9A227", fontFamily: "sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Layered Offset</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, width: "100%", maxWidth: 580 }}>
        {TILES.map((src, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "4/5",
              borderRadius: 16,
              overflow: "hidden",
              border: "2px solid rgba(201,162,39,0.6)",
              boxShadow: "8px 8px 0px 0px #C9A227",
              position: "relative",
            }}
          >
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ))}
      </div>
      <p style={{ color: "rgba(250,248,245,0.4)", fontFamily: "sans-serif", fontSize: 12, marginTop: 8, textAlign: "center" }}>Hard gold offset — clean, graphic, editorial</p>
    </div>
  );
}
