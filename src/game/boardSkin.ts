export interface BoardSkinHighlightStyle {
  fill: number;
  stroke: number;
}

export interface BoardSkin {
  frameWood: {
    base: number;
    highlight: number;
    shadow: number;
  };
  felt: {
    base: number;
    noiseOpacity: number;
  };
  point: {
    light: number;
    dark: number;
    triangleLengthRatio?: number;
    triangleInset?: number;
    triangleAlpha?: number;
  };
  checker: {
    light: {
      base: number;
      highlight: number;
    };
    dark: {
      base: number;
      highlight: number;
    };
  };
  ornament: {
    color: number;
    opacity: number;
  };
  highlights: {
    movable: BoardSkinHighlightStyle;
    selected: BoardSkinHighlightStyle;
    lastMove: BoardSkinHighlightStyle;
    hint: BoardSkinHighlightStyle;
    legalDestination: BoardSkinHighlightStyle;
  };
}

export const modernClassicBoardSkin: BoardSkin = {
  frameWood: {
    base: 0x8b5a2b,
    highlight: 0xc89b6d,
    shadow: 0x5a3a1a,
  },
  felt: {
    base: 0x12372a,
    noiseOpacity: 0.15,
  },
  point: {
    light: 0xf5e6c8,
    dark: 0xc19a6b,
    triangleLengthRatio: 0.65,
    triangleInset: 0,
    triangleAlpha: 0.9,
  },
  checker: {
    light: {
      base: 0xfdf6e3,
      highlight: 0xffffff,
    },
    dark: {
      base: 0x2d2d2d,
      highlight: 0x1a1a1a,
    },
  },
  ornament: {
    color: 0xd4af37,
    opacity: 0.45,
  },
  highlights: {
    hint: {
      fill: 0x22d3ee,
      stroke: 0x06b6d4,
    },
    lastMove: {
      fill: 0x818cf8,
      stroke: 0x6366f1,
    },
    movable: {
      fill: 0xeab308,
      stroke: 0xca8a04,
    },
    selected: {
      fill: 0x4ade80,
      stroke: 0x22c55e,
    },
    legalDestination: {
      fill: 0x22c55e,
      stroke: 0x16a34a,
    },
  },
};

