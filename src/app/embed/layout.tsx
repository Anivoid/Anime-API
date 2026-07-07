export const metadata = {
  title: "Video Player",
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="bg-black m-0 p-0 overflow-hidden">{children}</body>
    </html>
  );
}
