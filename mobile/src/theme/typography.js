/**
 * PROWASH Typography Scale
 * Import makeTextStyle() to build consistent text styles.
 */
const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
};

const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

/**
 * Build a React Native text style object.
 * @param {keyof fontSizes} size
 * @param {keyof fontWeights} weight
 * @param {string|undefined} color  - hex string or undefined
 * @returns {object}
 */
function makeTextStyle(size = 'md', weight = 'regular', color) {
  const style = {
    fontSize: fontSizes[size] ?? fontSizes.md,
    fontWeight: fontWeights[weight] ?? fontWeights.regular,
    lineHeight: (fontSizes[size] ?? fontSizes.md) * lineHeights.normal,
  };
  if (color) style.color = color;
  return style;
}

const typography = {
  fontSizes,
  fontWeights,
  lineHeights,
  makeTextStyle,
};

export default typography;
