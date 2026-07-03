; Custom NSIS hooks for electron-builder
;
; IMPORTANT: Do NOT delete the user-data folder here.
; Installing a new version over an existing one runs the OLD uninstaller first,
; so deleting %APPDATA%\BizFlow / %LOCALAPPDATA%\BizFlow on uninstall would wipe
; the user's database.db and settings on every UPDATE (data loss).
;
; We intentionally leave customRemoveFiles empty so only the installed program
; files are removed on uninstall — the database and settings are preserved.
; (Combined with deleteAppDataOnUninstall: false in electron-builder.yml.)

!macro customRemoveFiles
  ; no-op — preserve %APPDATA%\BizFlow (database.db + settings) across updates/uninstall
!macroend
