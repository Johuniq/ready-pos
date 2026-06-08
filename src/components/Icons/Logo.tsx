export default function Logo({ className = "w-7 h-7" }: { className?: string }) {
  // Get the plugin URL from WordPress localized data
  const pluginUrl = typeof readypos_admin !== 'undefined' 
    ? readypos_admin.pluginUrl 
    : '/wp-content/plugins/ready-pos';

  return (
    <img
      src={`${pluginUrl}/assets/images/pos.png`}
      alt="ReadyPOS Logo"
      className={className}
    />
  );
}
