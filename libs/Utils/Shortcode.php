<?php
namespace Readypos\Libs\Utils;

/**
 * Shortcode Class for WordPress
 * 
 * This class allows dynamic creation of shortcodes in WordPress with attributes and content support.
 */
class Shortcode {
    private string $tag;
    private array $attrs = [];
    private $render;
    
    /**
     * Create a new Shortcode instance
     */
    public static function add(): self {
        return new self();
    }
    
    /**
     * Set the shortcode tag
     */
    public function tag(string $tag): self {
        $this->tag = $tag;
        return $this;
    }
    
    /**
     * Define accepted attributes for the shortcode
     */
    public function attrs(array $attrs): self {
        $this->attrs = $attrs;
        return $this;
    }
    
    /**
     * Set the rendering method for the shortcode (callback function or view file path)
     */
    public function render($render): self {
        $this->render = $render;
        add_shortcode($this->tag, [$this, 'handleShortcode']);
        return $this;
    }
    
    /**
     * Handle shortcode rendering
     *
     * SECURITY NOTE: Output is sanitized with wp_kses_post to allow safe HTML
     * while preventing XSS attacks. Callback functions should return HTML content
     * that will be filtered through wp_kses_post.
     */
    public function handleShortcode($atts, $content = null) {
        $atts = shortcode_atts(array_fill_keys($this->attrs, ''), $atts, $this->tag);
        
        $output = '';
        
        if (is_callable($this->render)) {
            // SECURITY FIX #WP.ORG-5: Sanitize callback output
            $output = call_user_func($this->render, $atts, $content);
        } elseif (is_string($this->render) && file_exists($this->render)) {
            ob_start();
            // phpcs:ignore WordPress.PHP.DontExtract.extract_extract -- Controlled extraction for shortcode template rendering
            extract($atts); // Extract attributes to be used as variables
            $shortcode_content = $content; // Pass content to the view file
            include $this->render;
            $output = ob_get_clean();
        }
        
        // Sanitize output to prevent XSS attacks
        // wp_kses_post allows safe HTML tags like <p>, <a>, <img>, etc.
        // If you need different sanitization, override this in your callback
        return wp_kses_post($output);
    }
}