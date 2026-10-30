/** ASCII char → HID keycode table for clipboard paste typing, plus the set of
 *  chars that need LeftShift. Newline maps to Enter (0x28) and tab to Tab
 *  (0x2b) so paste handles multiline text. */

export const CharCodes: Record<number, number> = {
  48: 0x27, // 0
  49: 0x1e, // 1
  50: 0x1f, // 2
  51: 0x20, // 3
  52: 0x21, // 4
  53: 0x22, // 5
  54: 0x23, // 6
  55: 0x24, // 7
  56: 0x25, // 8
  57: 0x26, // 9

  65: 0x04, // A … Z
  66: 0x05,
  67: 0x06,
  68: 0x07,
  69: 0x08,
  70: 0x09,
  71: 0x0a,
  72: 0x0b,
  73: 0x0c,
  74: 0x0d,
  75: 0x0e,
  76: 0x0f,
  77: 0x10,
  78: 0x11,
  79: 0x12,
  80: 0x13,
  81: 0x14,
  82: 0x15,
  83: 0x16,
  84: 0x17,
  85: 0x18,
  86: 0x19,
  87: 0x1a,
  88: 0x1b,
  89: 0x1c,
  90: 0x1d,

  97: 0x04, // a … z
  98: 0x05,
  99: 0x06,
  100: 0x07,
  101: 0x08,
  102: 0x09,
  103: 0x0a,
  104: 0x0b,
  105: 0x0c,
  106: 0x0d,
  107: 0x0e,
  108: 0x0f,
  109: 0x10,
  110: 0x11,
  111: 0x12,
  112: 0x13,
  113: 0x14,
  114: 0x15,
  115: 0x16,
  116: 0x17,
  117: 0x18,
  118: 0x19,
  119: 0x1a,
  120: 0x1b,
  121: 0x1c,
  122: 0x1d,

  32: 0x2c, // Space
  33: 0x1e, // !
  34: 0x34, // "
  35: 0x20, // #
  36: 0x21, // $
  37: 0x22, // %
  38: 0x24, // &
  39: 0x34, // '
  40: 0x26, // (
  41: 0x27, // )
  42: 0x25, // *
  43: 0x2e, // +
  44: 0x36, // ,
  45: 0x2d, // -
  46: 0x37, // .
  47: 0x38, // /

  9: 0x2b, // Tab
  10: 0x28, // Enter
  58: 0x33, // :
  59: 0x33, // ;
  60: 0x36, // <
  61: 0x2e, // =
  62: 0x37, // >
  63: 0x38, // ?
  64: 0x1f, // @
  91: 0x2f, // [
  92: 0x31, // backslash
  93: 0x30, // ]
  94: 0x23, // ^
  95: 0x2d, // _
  96: 0x35, // `
  123: 0x2f, // {
  124: 0x31, // |
  125: 0x30, // }
  126: 0x35, // ~
};

export const ShiftChars: Record<number, boolean> = {
  33: true, // !
  34: true, // "
  35: true, // #
  36: true, // $
  37: true, // %
  38: true, // &
  40: true, // (
  41: true, // )
  42: true, // *
  43: true, // +
  58: true, // :
  60: true, // <
  62: true, // >
  63: true, // ?
  64: true, // @
  94: true, // ^
  95: true, // _
  123: true, // {
  124: true, // |
  125: true, // }
  126: true, // ~
};
