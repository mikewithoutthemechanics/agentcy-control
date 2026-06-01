export declare const ENVIRONMENTS: string[];
export declare const SERVICE_TYPES: string[];
export declare const PROJECT_CATEGORIES: string[];
export declare const INCIDENT_SEVERITIES: readonly [{
    readonly value: "sev1-critical";
    readonly label: "SEV 1 - Critical";
    readonly color: "#dc2626";
}, {
    readonly value: "sev2-high";
    readonly label: "SEV 2 - High";
    readonly color: "#ea580c";
}, {
    readonly value: "sev3-medium";
    readonly label: "SEV 3 - Medium";
    readonly color: "#ca8a04";
}, {
    readonly value: "sev4-low";
    readonly label: "SEV 4 - Low";
    readonly color: "#2563eb";
}];
export declare const DEPLOYMENT_STATUSES: readonly [{
    readonly value: "pending";
    readonly label: "Pending";
    readonly color: "#6b7280";
}, {
    readonly value: "building";
    readonly label: "Building";
    readonly color: "#ca8a04";
}, {
    readonly value: "ready";
    readonly label: "Ready";
    readonly color: "#16a34a";
}, {
    readonly value: "failed";
    readonly label: "Failed";
    readonly color: "#dc2626";
}, {
    readonly value: "cancelled";
    readonly label: "Cancelled";
    readonly color: "#6b7280";
}, {
    readonly value: "rolled_back";
    readonly label: "Rolled Back";
    readonly color: "#9333ea";
}];
export declare const DEFAULT_BRAND_COLORS: {
    primary: string;
    secondary: string;
    accent: string;
};
//# sourceMappingURL=constants.d.ts.map