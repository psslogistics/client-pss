"use client";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1>Super Admin Layout</h1>
      <div>
        {children}
      </div>
    </div>
  );
}
