namespace Dev.Mcp.Models;

// ── read_lines ────────────────────────────────────────────────────────────────
public sealed record LineEntry(int LineNo, string Text);

public sealed record ReadLinesResult(
    string FilePath,
    IReadOnlyList<LineEntry> Lines,
    int TotalLines,
    int RequestedStart,
    int RequestedEnd);

// ── read_files_batch ──────────────────────────────────────────────────────────
public sealed record BatchFileResult(string FilePath, string? Content, string? Error);

// ── apply_text_patch ──────────────────────────────────────────────────────────
public sealed record CompilerGateResult(bool Ran, int ErrorCount, IReadOnlyList<string> Errors);

public sealed record ApplyPatchResult(
    bool Success,
    string FilePath,
    int LinesChanged,
    string Mode,
    bool DryRun,
    CompilerGateResult? CompilerGate,
    string? Error);

// ── rename_file_with_impact ───────────────────────────────────────────────────
public sealed record RenameImpact(
    IReadOnlyList<string> Importers,
    IReadOnlyList<string> SpecRefs,
    IReadOnlyList<string> CsprojRefs);

public sealed record RenameWithImpactResult(
    string OldPath,
    string NewPath,
    bool Executed,
    RenameImpact Impact,
    string? Error);

// ── git_changed_files ─────────────────────────────────────────────────────────
public sealed record GitChangedFile(string Path, string Status);

public sealed record GitChangedFilesResult(
    IReadOnlyList<GitChangedFile> Files,
    string RepoRoot,
    string Base);

// ── slice_test_targets ────────────────────────────────────────────────────────
public sealed record AngularTestSlice(IReadOnlyList<string> IncludeGlobs, string SuggestedNgTestArgs);

public sealed record DotnetTestSlice(string? TestProjectPath, string? Filter);

public sealed record SliceTestTargetsResult(
    AngularTestSlice? Angular,
    DotnetTestSlice? Dotnet);

// ── find_angular_route ────────────────────────────────────────────────────────
public sealed record AngularRouteMatch(
    string RoutePath,
    string? Component,
    string FilePath,
    int Line,
    IReadOnlyList<string>? Guards);

public sealed record FindAngularRouteResult(
    IReadOnlyList<AngularRouteMatch> Routes,
    bool Truncated);

// ── find_angular_guard ────────────────────────────────────────────────────────
public sealed record AngularGuardMatch(
    string Name,
    string FilePath,
    int Line,
    bool? CanActivate,
    bool? CanActivateChild);

public sealed record FindAngularGuardResult(
    IReadOnlyList<AngularGuardMatch> Guards,
    bool Truncated);

// ── find_dotnet_endpoint ──────────────────────────────────────────────────────
public sealed record DotnetEndpointMatch(
    string? Controller,
    string? Action,
    string? HttpMethod,
    string? RouteTemplate,
    string FilePath,
    int Line);

public sealed record FindDotnetEndpointResult(
    IReadOnlyList<DotnetEndpointMatch> Endpoints,
    bool Truncated);

// ── find_di_registration ──────────────────────────────────────────────────────
public sealed record DiRegistrationMatch(
    string? Service,
    string? Lifetime,
    string FilePath,
    int Line,
    string RegistrationPattern);

public sealed record FindDiRegistrationResult(
    IReadOnlyList<DiRegistrationMatch> Registrations,
    bool Truncated);

// ── read_component_bundle ─────────────────────────────────────────────────────
public sealed record ComponentSignatures(IReadOnlyList<SignatureEntry> Items);

public sealed record TemplateInfo(string? FilePath, string? Content, IReadOnlyList<string>? Bindings);

public sealed record StylesInfo(string? FilePath, bool HasStyles);

public sealed record SpecInfo(string? FilePath, IReadOnlyList<SignatureEntry>? Signatures);

public sealed record ReadComponentBundleResult(
    string ComponentPath,
    string? Selector,
    bool? Standalone,
    IReadOnlyList<string>? Imports,
    ComponentSignatures? Typescript,
    TemplateInfo? Template,
    StylesInfo? Styles,
    SpecInfo? Spec);

// ── update_imports ────────────────────────────────────────────────────────────
public sealed record ImportChange(string File, int Line, string OldImport, string NewImport);

public sealed record UpdateImportsResult(
    bool Success,
    int FilesUpdated,
    IReadOnlyList<ImportChange> Changes,
    string? Error);

// ── git_diff_summary ──────────────────────────────────────────────────────────
public sealed record DiffHunk(string Header, IReadOnlyList<string> ContextLines);

public sealed record FileDiffSummary(string FilePath, int AddedLines, int RemovedLines, IReadOnlyList<DiffHunk> Hunks);

public sealed record GitDiffSummaryResult(IReadOnlyList<FileDiffSummary> Files);

// ── delete_file_safe ──────────────────────────────────────────────────────────
public sealed record FileReferenceMatch(string FilePath, int Line, string Context);

public sealed record DeleteFileSafeResult(
    bool WouldDelete,
    IReadOnlyList<FileReferenceMatch> References,
    bool Safe,
    string? Warning,
    bool Deleted);

// ── replace_in_files ──────────────────────────────────────────────────────────
public sealed record ReplacePreview(string Path, int Occurrences, string Preview);

public sealed record ReplaceInFilesResult(
    IReadOnlyList<ReplacePreview> AffectedFiles,
    int TotalOccurrences,
    bool Applied);

// ── insert_member ─────────────────────────────────────────────────────────────
public sealed record InsertMemberResult(bool Success, string FilePath, int InsertedAtLine, string? Error);

// ── scaffold_dto ──────────────────────────────────────────────────────────────
public sealed record ScaffoldDtoProperty(string Name, string Type, bool Required = false);

public sealed record ScaffoldDtoResult(bool Success, string? FilePath, string? Error);

// ── scaffold_api_action ───────────────────────────────────────────────────────
public sealed record ScaffoldApiActionResult(bool Success, string? FilePath, int? InsertedAtLine, string? Error);
