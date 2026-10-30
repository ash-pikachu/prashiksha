=== OLD ===
            <button
              type="button"
              className="font-semibold transition-colors"
              style={{ color: "#7c5cfc" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f9a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7c5cfc")}
            >
              Create a free account
            </button>
=== NEW ===
            <button
              type="button"
              className="font-semibold transition-all duration-150"
              style={{ color: "#7c5cfc" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f43f9a"; e.currentTarget.style.letterSpacing = "0.01em"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#7c5cfc"; e.currentTarget.style.letterSpacing = "0"; }}
            >
              Create a free account
            </button>