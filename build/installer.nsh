!macro customInit
  ; Close the app if it's running before installation
  nsExec::Exec 'taskkill /F /IM BizFlow.exe'
  Pop $0
!macroend

!macro customInstall
  ; Additional custom install steps can be added here if needed
!macroend
