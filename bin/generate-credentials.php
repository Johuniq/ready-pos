#!/usr/bin/env php
<?php
/**
 * Credential Obfuscation Generator
 *
 * This script helps you generate obfuscated credentials for Manager.php
 * 
 * Usage:
 *   php bin/generate-credentials.php
 *
 * You will be prompted to enter your:
 * - Polar.sh API Token
 * - Polar.sh Organization ID
 *
 * The script will output PHP code that you can copy into Manager.php
 * 
 * @package Readypos\Tools
 */

function generate_obfuscated_parts( $credential, $chunk_size = 24 ) {
	$parts = str_split( $credential, $chunk_size );
	$encoded_parts = array_map( 'base64_encode', $parts );
	
	echo "			\$parts = array(\n";
	foreach ( $encoded_parts as $part ) {
		echo "				'{$part}',\n";
	}
	echo "			);\n";
	echo "			return self::_decode_parts( \$parts );\n";
}

echo "╔════════════════════════════════════════════════════════════╗\n";
echo "║      ReadyPOS Credential Obfuscation Generator             ║\n";
echo "╚════════════════════════════════════════════════════════════╝\n\n";

echo "This tool will help you obfuscate your Polar.sh credentials\n";
echo "for secure distribution in your plugin.\n\n";

echo "⚠️  IMPORTANT: This provides obfuscation, not encryption.\n";
echo "    Determined attackers can still extract these credentials.\n";
echo "    Always use read-only API tokens with minimal permissions.\n\n";

// Get token
echo "Enter your Polar.sh API Token (polar_oat_...): ";
$token = trim( fgets( STDIN ) );

if ( empty( $token ) ) {
	die( "❌ Error: Token cannot be empty\n" );
}

// Get org ID
echo "Enter your Polar.sh Organization ID (uuid format): ";
$org_id = trim( fgets( STDIN ) );

if ( empty( $org_id ) ) {
	die( "❌ Error: Organization ID cannot be empty\n" );
}

echo "\n";
echo "════════════════════════════════════════════════════════════\n";
echo "Generated Code - Copy this to Manager.php _get_credential()\n";
echo "════════════════════════════════════════════════════════════\n\n";

echo "Replace the 'token' case:\n\n";
echo "		if ( \$type === 'token' ) {\n";
generate_obfuscated_parts( $token );
echo "		}\n\n";

echo "Replace the 'org_id' case:\n\n";
echo "		if ( \$type === 'org_id' ) {\n";
generate_obfuscated_parts( $org_id );
echo "		}\n\n";

echo "════════════════════════════════════════════════════════════\n";
echo "✅ Done! Copy the code above into Manager.php\n";
echo "════════════════════════════════════════════════════════════\n";
