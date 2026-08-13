export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber',
      secondary: 'violet',
      success: 'emerald',
      info: 'sky',
      warning: 'orange',
      error: 'rose',
      neutral: 'zinc'
    },
    button: {
      slots: {
        base: 'font-medium transition-[transform,box-shadow,background-color] duration-300 ease-lab active:scale-[0.97]'
      }
    },
    input: {
      slots: {
        base: 'transition-[box-shadow,background-color] duration-300 ease-lab'
      }
    },
    badge: {
      slots: {
        base: 'font-medium tracking-wide'
      }
    },
    card: {
      slots: {
        root: 'backdrop-blur-xl'
      }
    }
  }
})
