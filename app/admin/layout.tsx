"use client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1>Admin Layout</h1>
      <div>
        {children}
      </div>
    </div>
  );
}
