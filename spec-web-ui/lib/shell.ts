export interface ShellBreadcrumb {
  href: string;
  label: string;
}

export function buildShellBreadcrumbs(pathname: string): ShellBreadcrumb[] {
  const segments = pathname.split("/").filter(Boolean);

  if (!segments.length) {
    return [{ href: "/", label: "~" }];
  }

  return [
    { href: "/", label: "~" },
    ...segments.map((segment, index) => ({
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label: segment
    }))
  ];
}

export function buildShellCommandTitle(command: string, target?: string) {
  const normalizedCommand = command.trim();
  const normalizedTarget = target?.trim();

  return normalizedTarget
    ? `$ ${normalizedCommand} ${normalizedTarget}`
    : `$ ${normalizedCommand}`;
}
