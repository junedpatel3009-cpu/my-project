import { createServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Banknote,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  FolderKanban,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAdminManagedUserDetails,
  type AdminManagedUserDetail,
} from "@/lib/admin-dashboard-db.server";
import { getCurrentUser } from "@/lib/current-user.server";
import {
  getAdminUsers,
  updateProfessionalVerifiedStatusByAdmin,
  updateUserActiveStatusByAdmin,
  updateUserPasswordByAdmin,
  type AdminUserRecord,
} from "@/lib/user-db.server";

const getUserManagementData = createServerFn({ method: "GET" }).handler(async () => {
  const viewer = getCurrentUser();

  if (!viewer || viewer.role !== "ADMIN") {
    return {
      viewer,
      users: [],
    };
  }

  const users = getAdminUsers().filter((user) => user.role === "CLIENT" || user.role === "PROFESSIONAL");

  return {
    viewer,
    users,
    userDetails: getAdminManagedUserDetails(
      users.map((user) => ({ id: user.id, role: user.role as "CLIENT" | "PROFESSIONAL" })),
    ),
  };
});

const updateManagedUserStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: number; isActive: boolean }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can change user status.");
    }

    return updateUserActiveStatusByAdmin(data.userId, data.isActive);
  });

const updateManagedProfessionalVerification = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: number; isVerified: boolean }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can change professional verification.");
    }

    return updateProfessionalVerifiedStatusByAdmin(data.userId, data.isVerified);
  });

const updateManagedUserPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: number; password: string }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can change user passwords.");
    }

    const passwordError = validatePassword(data.password);
    if (passwordError) {
      throw new Error(passwordError);
    }

    const passwordBuffer = new TextEncoder().encode(data.password);
    const passwordDigest = await crypto.subtle.digest("SHA-256", passwordBuffer);
    const passwordHash = Array.from(new Uint8Array(passwordDigest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");

    updateUserPasswordByAdmin(data.userId, passwordHash);
    return { ok: true as const };
  });

export const Route = createFileRoute("/user-management")({
  loader: () => getUserManagementData(),
  head: () => ({ meta: [{ title: "User Management - Servio" }] }),
  component: UserManagement,
});

function UserManagement() {
  const data = useLoaderData({ from: "/user-management" });
  const router = useRouter();
  const [clientQuery, setClientQuery] = useState("");
  const [professionalQuery, setProfessionalQuery] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  if (!data.viewer || data.viewer.role !== "ADMIN") {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-soft">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in from the admin panel to manage clients and professionals.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/admin">Open admin panel</Link>
          </Button>
        </div>
      </div>
    );
  }

  const users = data.users as AdminUserRecord[];
  const clients = users.filter((user) => user.role === "CLIENT");
  const professionals = users.filter((user) => user.role === "PROFESSIONAL");
  const visibleClients = filterUsers(clients, clientQuery);
  const visibleProfessionals = filterUsers(professionals, professionalQuery);
  const displayName = `${data.viewer.firstName} ${data.viewer.lastName}`.trim() || data.viewer.email;
  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const selectedUserDetail = selectedUserId
    ? (data.userDetails[selectedUserId] as AdminManagedUserDetail | undefined)
    : undefined;

  async function handleStatusChange(user: AdminUserRecord, isActive: boolean) {
    const actionKey = `status-${user.id}`;
    setPendingAction(actionKey);

    try {
      await updateManagedUserStatus({ data: { userId: user.id, isActive } });
      await router.invalidate();
    } finally {
      setPendingAction(null);
    }
  }

  async function handleVerificationChange(user: AdminUserRecord, isVerified: boolean) {
    const actionKey = `verified-${user.id}`;
    setPendingAction(actionKey);

    try {
      await updateManagedProfessionalVerification({ data: { userId: user.id, isVerified } });
      await router.invalidate();
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePasswordChange(user: AdminUserRecord, password: string) {
    const actionKey = `password-${user.id}`;
    setPendingAction(actionKey);

    try {
      await updateManagedUserPassword({ data: { userId: user.id, password } });
      await router.invalidate();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <AppShell userName={displayName} userRole="Admin" userAvatarUrl={data.viewer.avatarUrl}>
      <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">User management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Clients & Professionals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage account status, professional verification, and profile readiness.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin">Back to admin</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Users} label="Clients" value={clients.length} caption={`${activeCount(clients)} active`} />
        <SummaryCard
          icon={BriefcaseBusiness}
          label="Professionals"
          value={professionals.length}
          caption={`${activeCount(professionals)} active`}
        />
        <SummaryCard
          icon={BadgeCheck}
          label="Verified pros"
          value={professionals.filter((user) => user.isVerified).length}
          caption="Approved professionals"
        />
        <SummaryCard
          icon={UserRound}
          label="Inactive users"
          value={users.filter((user) => !user.isActive).length}
          caption="Clients and professionals"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <UserSection
          title="Clients"
          description="People or companies posting jobs and hiring professionals."
          icon={Users}
          query={clientQuery}
          onQueryChange={setClientQuery}
          placeholder="Search clients..."
          users={visibleClients}
          pendingAction={pendingAction}
          onStatusChange={handleStatusChange}
          onUserSelect={setSelectedUserId}
        />
        <UserSection
          title="Professionals"
          description="Service providers, verification, rates, and availability."
          icon={BriefcaseBusiness}
          query={professionalQuery}
          onQueryChange={setProfessionalQuery}
          placeholder="Search professionals..."
          users={visibleProfessionals}
          pendingAction={pendingAction}
          onStatusChange={handleStatusChange}
          onVerificationChange={handleVerificationChange}
          onUserSelect={setSelectedUserId}
        />
      </div>

      <UserDetailDialog
        key={selectedUser?.id || "closed"}
        user={selectedUser}
        detail={selectedUserDetail}
        open={selectedUser !== null}
        pendingAction={pendingAction}
        onStatusChange={handleStatusChange}
        onPasswordChange={handlePasswordChange}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      />
    </AppShell>
  );
}

function UserSection({
  title,
  description,
  icon: Icon,
  query,
  onQueryChange,
  placeholder,
  users,
  pendingAction,
  onStatusChange,
  onVerificationChange,
  onUserSelect,
}: {
  title: string;
  description: string;
  icon: typeof Users;
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  users: AdminUserRecord[];
  pendingAction: string | null;
  onStatusChange: (user: AdminUserRecord, isActive: boolean) => void;
  onVerificationChange?: (user: AdminUserRecord, isVerified: boolean) => void;
  onUserSelect: (userId: number) => void;
}) {
  const isProfessionals = title === "Professionals";

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      </div>

      {users.length ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {users.map((user) => {
            const fullName = getFullName(user);
            const statusKey = `status-${user.id}`;
            const verifiedKey = `verified-${user.id}`;

            return (
              <article
                key={user.id}
                className="cursor-pointer p-4 transition-colors hover:bg-muted/35"
                onClick={() => onUserSelect(user.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onUserSelect(user.id);
                }}
                role="button"
                tabIndex={0}
                aria-label={`View full details for ${fullName}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <img
                      src={user.avatarUrl || `https://i.pravatar.cc/100?u=${user.id}`}
                      className="h-11 w-11 rounded-full object-cover"
                      alt=""
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{fullName}</h3>
                        <Badge variant={user.isActive ? "default" : "outline"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {isProfessionals ? (
                          <Badge variant={user.isVerified ? "default" : "secondary"}>
                            {user.isVerified ? "Verified" : "Pending"}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {user.email}
                        </span>
                        {user.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {user.phone}
                          </span>
                        ) : null}
                      </div>
                      <UserDetails user={user} />
                    </div>
                  </div>

                  <div
                    className="flex shrink-0 flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:w-52"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">Account active</span>
                      <Switch
                        checked={user.isActive}
                        disabled={pendingAction !== null}
                        onCheckedChange={(checked) => onStatusChange(user, checked)}
                        aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${fullName}`}
                      />
                    </label>
                    {pendingAction === statusKey ? (
                      <p className="text-xs text-muted-foreground">Saving status...</p>
                    ) : null}
                    {isProfessionals && onVerificationChange ? (
                      <>
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">Verified</span>
                          <Switch
                            checked={user.isVerified}
                            disabled={pendingAction !== null}
                            onCheckedChange={(checked) => onVerificationChange(user, checked)}
                            aria-label={`${user.isVerified ? "Unverify" : "Verify"} ${fullName}`}
                          />
                        </label>
                        {pendingAction === verifiedKey ? (
                          <p className="text-xs text-muted-foreground">Saving verification...</p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} found.
        </div>
      )}
    </section>
  );
}

function UserDetailDialog({
  user,
  detail,
  open,
  pendingAction,
  onStatusChange,
  onPasswordChange,
  onOpenChange,
}: {
  user: AdminUserRecord | null;
  detail?: AdminManagedUserDetail;
  open: boolean;
  pendingAction: string | null;
  onStatusChange: (user: AdminUserRecord, isActive: boolean) => Promise<void>;
  onPasswordChange: (user: AdminUserRecord, password: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  if (!user) return null;

  const fullName = getFullName(user);
  const isProfessional = user.role === "PROFESSIONAL";
  const passwordPending = pendingAction === `password-${user.id}`;

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setPasswordMessage({ type: "error", text: passwordError });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Password confirmation does not match." });
      return;
    }

    try {
      await onPasswordChange(user, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: "Password changed successfully. The user can now log in with it." });
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Password could not be changed.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <div className="border-b bg-muted/30 p-6">
          <DialogHeader>
            <div className="flex items-start gap-4 pr-8">
              <img
                src={user.avatarUrl || `https://i.pravatar.cc/100?u=${user.id}`}
                className="h-16 w-16 rounded-full object-cover"
                alt=""
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl">{fullName}</DialogTitle>
                  <Badge>{formatEnum(user.role)}</Badge>
                  <Badge variant={user.isActive ? "default" : "outline"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {isProfessional ? (
                    <Badge variant={user.isVerified ? "default" : "secondary"}>
                      {user.isVerified ? "Verified" : "Pending verification"}
                    </Badge>
                  ) : null}
                </div>
                <DialogDescription className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>{user.email}</span>
                  {user.phone ? <span>{user.phone}</span> : null}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailStat
              icon={CalendarDays}
              label="Account created"
              value={formatDateTime(user.createdAt)}
            />
            <DetailStat
              icon={Clock3}
              label="Last login"
              value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Not recorded yet"}
            />
            <DetailStat
              icon={FolderKanban}
              label="Projects"
              value={`${detail?.projectCount || 0} total`}
            />
            <DetailStat
              icon={Banknote}
              label={isProfessional ? "Gross earned" : "Total paid"}
              value={formatMoney(detail?.totalMoney || 0)}
            />
          </div>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects ({detail?.projectCount || 0})</TabsTrigger>
              <TabsTrigger value="payments">Payments ({detail?.transactions.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <DetailPanel title="Account information">
                  <InfoRow label="Account ID" value={`#${user.id}`} />
                  <InfoRow label="Sign-in method" value={formatSignInMethod(user)} />
                  <InfoRow label="Account access" value={user.isActive ? "Allowed" : "Blocked"} />
                  <InfoRow label="Created" value={formatDateTime(user.createdAt)} />
                  <InfoRow label="Last updated" value={formatDateTime(user.updatedAt)} />
                </DetailPanel>
                <DetailPanel title={isProfessional ? "Professional profile" : "Client profile"}>
                  {isProfessional ? (
                    <>
                      <InfoRow label="Category" value={user.professionalCategory || "Not set"} />
                      <InfoRow label="City" value={user.professionalCity || "Not set"} />
                      <InfoRow label="Experience" value={user.experienceYears ? `${user.experienceYears} years` : "Not set"} />
                      <InfoRow label="Rate" value={formatProfessionalRate(user)} />
                      <InfoRow label="Availability" value={formatEnum(user.availabilityStatus || "available")} />
                    </>
                  ) : (
                    <>
                      <InfoRow label="Company" value={user.companyName || "Not set"} />
                      <InfoRow label="Industry" value={user.industry || "Not set"} />
                      <InfoRow label="Projects posted" value={String(detail?.projectCount || 0)} />
                    </>
                  )}
                </DetailPanel>
                <DetailPanel title="Project status">
                  <InfoRow label="Active" value={String(detail?.activeProjectCount || 0)} />
                  <InfoRow label="Completed" value={String(detail?.completedProjectCount || 0)} />
                  <InfoRow label="Other / unassigned" value={String(Math.max(0, (detail?.projectCount || 0) - (detail?.activeProjectCount || 0) - (detail?.completedProjectCount || 0)))} />
                </DetailPanel>
                <DetailPanel title="Money summary">
                  <InfoRow label={isProfessional ? "Gross earnings" : "Completed payments"} value={formatMoney(detail?.totalMoney || 0)} />
                  {isProfessional ? (
                    <InfoRow label="Estimated net after 10% fee" value={formatMoney((detail?.totalMoney || 0) * 0.9)} />
                  ) : null}
                  <InfoRow label="Transactions" value={String(detail?.transactions.length || 0)} />
                </DetailPanel>
                <DetailPanel title="Access and security">
                  <div className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium">Account active</p>
                      <p className="text-xs text-muted-foreground">
                        {user.isActive
                          ? "Login and existing sessions are allowed."
                          : "Password login, Google login, and existing sessions are blocked."}
                      </p>
                    </div>
                    <Switch
                      checked={user.isActive}
                      disabled={pendingAction !== null}
                      onCheckedChange={(checked) => void onStatusChange(user, checked)}
                      aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${fullName}`}
                    />
                  </div>

                  <form className="mt-4 space-y-3 border-t pt-4" onSubmit={submitPasswordChange}>
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Set new password</p>
                    </div>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="New password"
                      autoComplete="new-password"
                      disabled={passwordPending}
                    />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      disabled={passwordPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use 8+ characters with uppercase, lowercase, number, and special character.
                    </p>
                    {passwordMessage ? (
                      <p className={`text-xs ${passwordMessage.type === "error" ? "text-destructive" : "text-emerald-600"}`}>
                        {passwordMessage.text}
                      </p>
                    ) : null}
                    <Button type="submit" size="sm" disabled={passwordPending || !newPassword || !confirmPassword}>
                      {passwordPending ? "Changing password..." : user.hasPassword ? "Change password" : "Create password"}
                    </Button>
                  </form>
                </DetailPanel>
              </div>
            </TabsContent>

            <TabsContent value="projects" className="mt-4">
              <div className="space-y-3">
                {detail?.projects.length ? detail.projects.map((project) => (
                  <div key={project.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-muted-foreground">{project.category} · Created {formatDate(project.createdAt)}</p>
                      </div>
                      <Badge variant="outline">{formatEnum(project.trackingStatus || project.status)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <InfoRow label={isProfessional ? "Client" : "Professional"} value={project.counterpartName || "Not assigned"} />
                      <InfoRow label="Agreed amount" value={project.agreedAmount ? formatMoney(project.agreedAmount) : "Not set"} />
                    </div>
                  </div>
                )) : <EmptyState message="No projects are connected to this user yet." />}
              </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <div className="space-y-3">
                {detail?.transactions.length ? detail.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-medium">{transaction.projectTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {isProfessional ? "Client" : "Professional"}: {transaction.counterpartName} · {formatDateTime(transaction.createdAt)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold">{formatMoney(transaction.amount, transaction.currency)}</p>
                      <Badge variant={transaction.status === "COMPLETED" ? "default" : "outline"}>
                        {formatEnum(transaction.status)}
                      </Badge>
                    </div>
                  </div>
                )) : <EmptyState message="No payment transactions are recorded for this user." />}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailStat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function DetailPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{message}</div>;
}

function UserDetails({ user }: { user: AdminUserRecord }) {
  if (user.role === "CLIENT") {
    return (
      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <Detail icon={Building2} label={user.companyName || "No company added"} />
        <Detail icon={BriefcaseBusiness} label={user.industry || "Industry not set"} />
        <Detail icon={ShieldCheck} label={`Joined ${formatDate(user.createdAt)}`} />
        <Detail icon={UserRound} label={formatEnum(user.authProvider)} />
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
      <Detail icon={BriefcaseBusiness} label={user.professionalCategory || "Category not set"} />
      <Detail icon={MapPin} label={user.professionalCity || "City not set"} />
      <Detail icon={Wallet} label={formatProfessionalRate(user)} />
      <Detail icon={Star} label={`${user.averageRating.toFixed(1)} rating / ${user.reviewCount} reviews`} />
      <Detail icon={ShieldCheck} label={`Joined ${formatDate(user.createdAt)}`} />
      <Detail icon={UserRound} label={formatEnum(user.availabilityStatus || "available")} />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function Detail({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function filterUsers(users: AdminUserRecord[], query: string) {
  const term = query.trim().toLowerCase();

  if (!term) {
    return users;
  }

  return users.filter((user) =>
    [
      user.firstName,
      user.lastName,
      user.email,
      user.phone,
      user.companyName,
      user.industry,
      user.professionalCategory,
      user.professionalCity,
      user.availabilityStatus,
      user.authProvider,
      user.isActive ? "active" : "inactive",
      user.isVerified ? "verified" : "pending",
    ]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

function activeCount(users: AdminUserRecord[]) {
  return users.filter((user) => user.isActive).length;
}

function getFullName(user: AdminUserRecord) {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

function formatProfessionalRate(user: AdminUserRecord) {
  if (user.hourlyRate) {
    return `$${user.hourlyRate.toLocaleString()}/hr`;
  }

  if (user.fixedRate) {
    return `$${user.fixedRate.toLocaleString()} fixed`;
  }

  return "Rate not set";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignInMethod(user: AdminUserRecord) {
  if (user.authProvider === "GOOGLE" && user.hasPassword) {
    return "Google + password";
  }

  return user.hasPassword ? "Password" : formatEnum(user.authProvider);
}

function validatePassword(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include one special character.";
  return null;
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
