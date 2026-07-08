using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;

namespace Dev.Mcp.Services;

/// <summary>
/// Windows Job Object wrapper. A process assigned to this job — and every
/// descendant it spawns, including ones that detach or create their own process
/// group — is force-terminated when the job handle closes
/// (JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE).
///
/// This reaps lingering grandchildren that <c>Process.Kill(entireProcessTree)</c>
/// misses: once an intermediate parent exits it breaks the parent→child link, so
/// a tree walk can no longer find the orphan. The job membership survives that,
/// so closing the job still kills the orphan.
/// </summary>
[SupportedOSPlatform("windows")]
internal sealed class JobObject : IDisposable
{
    private const int JobObjectExtendedLimitInformation = 9;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

    private nint _handle;

    public JobObject()
    {
        _handle = CreateJobObject(nint.Zero, null);
        if (_handle == nint.Zero)
            throw new InvalidOperationException($"CreateJobObject failed (Win32 {Marshal.GetLastWin32Error()}).");

        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            BasicLimitInformation = new JOBOBJECT_BASIC_LIMIT_INFORMATION
            {
                LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
            },
        };

        var length = Marshal.SizeOf(info);
        var infoPtr = Marshal.AllocHGlobal(length);
        try
        {
            Marshal.StructureToPtr(info, infoPtr, fDeleteOld: false);
            if (!SetInformationJobObject(_handle, JobObjectExtendedLimitInformation, infoPtr, (uint)length))
                throw new InvalidOperationException($"SetInformationJobObject failed (Win32 {Marshal.GetLastWin32Error()}).");
        }
        finally
        {
            Marshal.FreeHGlobal(infoPtr);
        }
    }

    /// <summary>
    /// Assigns a running process to the job. Best-effort: if the process already
    /// exited, or is in a parent job that forbids nesting, this is a no-op and the
    /// caller's tree-kill fallback still applies.
    /// </summary>
    public void AssignProcess(Process process)
    {
        if (_handle == nint.Zero) return;
        try { AssignProcessToJobObject(_handle, process.Handle); }
        catch { /* process handle unavailable (already exited): fall back to tree-kill */ }
    }

    /// <summary>
    /// Closes the job handle. With KILL_ON_JOB_CLOSE set, this terminates every
    /// process still in the job — the whole subtree, orphaned grandchildren included.
    /// </summary>
    public void Dispose()
    {
        if (_handle == nint.Zero) return;
        CloseHandle(_handle);
        _handle = nint.Zero;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern nint CreateJobObject(nint lpJobAttributes, string? lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetInformationJobObject(nint hJob, int jobObjectInfoClass, nint lpJobObjectInfo, uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AssignProcessToJobObject(nint hJob, nint hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CloseHandle(nint hObject);

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public nuint MinimumWorkingSetSize;
        public nuint MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public nuint Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public nuint ProcessMemoryLimit;
        public nuint JobMemoryLimit;
        public nuint PeakProcessMemoryUsed;
        public nuint PeakJobMemoryUsed;
    }
}
