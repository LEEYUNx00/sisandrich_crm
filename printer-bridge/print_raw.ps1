
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class RawPrinterHelper {
            [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
            public class DOCINFOW {
                [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
                [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
                [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
            }
            [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPWStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
            
            [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool ClosePrinter(IntPtr hPrinter);
            
            [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOW di);
            
            [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool EndDocPrinter(IntPtr hPrinter);
            
            [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool StartPagePrinter(IntPtr hPrinter);
            
            [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool EndPagePrinter(IntPtr hPrinter);
            
            [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
            
            public static bool SendStringToPrinter(string szPrinterName, string szString) {
                IntPtr pBytes = Marshal.StringToCoTaskMemAnsi(szString);
                Int32 dwCount = szString.Length;
                Int32 dwWritten = 0;
                IntPtr hPrinter = new IntPtr(0);
                DOCINFOW di = new DOCINFOW();
                bool bSuccess = false;
                di.pDocName = "RAW Label Print"; di.pDataType = "RAW";
                if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
                    if (StartDocPrinter(hPrinter, 1, di)) {
                        if (StartPagePrinter(hPrinter)) {
                            bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                            EndPagePrinter(hPrinter);
                        }
                        EndDocPrinter(hPrinter);
                    }
                    ClosePrinter(hPrinter);
                } else {
                    int err = Marshal.GetLastWin32Error();
                    Console.WriteLine("OpenPrinter failed with Win32 Error: " + err);
                }
                Marshal.FreeCoTaskMem(pBytes);
                return bSuccess;
            }
        }
"@;
        $tspl = [System.IO.File]::ReadAllText('C:\\Users\\liliy\\Desktop\\sisandrich\\WEB_CRM_POS\\printer-bridge\\temp_tspl.txt');
        $success = [RawPrinterHelper]::SendStringToPrinter('TSC TTP-247', $tspl);
        if (-not $success) {
            throw "Failed to open printer 'TSC TTP-247' or send data. Please ensure the printer name is exactly correct and online."
        }
    