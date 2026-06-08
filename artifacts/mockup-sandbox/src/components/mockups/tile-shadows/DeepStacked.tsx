const TILES = [
  "/__mockup/images/tile1.jpg",
  "/__mockup/images/tile2.jpg",
  "/__mockup/images/tile3.jpg",
  "/__mockup/images/tile4.jpg",
  "/__mockup/images/tile5.jpg",
  "/__mockup/images/tile6.jpg",
];

export function DeepStacked() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#181D37", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", gap: 24 }}>
      <p style={{ color: "#C9A227", fontFamily: "sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Deep Stacked</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, width: "100%", maxWidth: 580 }}>
        {TILES.map((src, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "4/5",
              borderRadius: 16,
              overflow: "hidden",
              border: "2px solid rgba(201,162,39,0.6)",
              boxShadow: [
                "2px 2px 0 #C9A227",
                "4px 4px 0 #B08820",
                "6px 6px 0 #7E5C14",
                "8px 8px 0 rgba(0,0,0,0.5)",
              ].join(", "),
              position: "relative",
            }}
          >
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ))}
      </div>
      <p style={{ color: "rgba(250,248,245,0.4)", fontFamily: "sans-serif", fontSize: 12, marginTop: 8, textAlign: "center" }}>Stepped gold layers — thick, stacked, luxurious depth</p>
    </div>
  );
}
