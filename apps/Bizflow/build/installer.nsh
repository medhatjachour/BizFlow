; Custom NSIS hooks for electron-builder
; Delete BizFlow app-data folder on uninstall.

!macro customRemoveFiles
  RMDir /r "$APPDATA\\bizflow"
  RMDir /r "$APPDATA\\BizFlow"
  RMDir /r "$LOCALAPPDATA\\bizflow"
  RMDir /r "$LOCALAPPDATA\\BizFlow"
!macroend
