import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

const DevModeContext = createContext(false)

export const DevModeProvider = ({
  children
}: {
  readonly children: React.ReactNode
}): React.JSX.Element => {
  const [isDevMode, setIsDevMode] = useState(false)

  useEffect(() => {
    let isMounted = true

    void window.logicSet.devMode.get().then((enabled) => {
      if (isMounted) {
        setIsDevMode(enabled)
      }
    })

    const unsubscribe = window.logicSet.devMode.onChanged(setIsDevMode)
    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  return (
    <DevModeContext.Provider value={isDevMode}>
      {children}
    </DevModeContext.Provider>
  )
}

export const useDevMode = (): boolean => useContext(DevModeContext)
