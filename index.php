<?php
/**
 * Plugin Name: TilaKalenteri
 * Description: Kalenteri huoneiden varaamista varten.
 * Version: 1.0.8
 * Author: Aleksei Nesterinen
 * Author URI: https://github.com/nesterinen
 * Plugin URI: https://codeload.github.com/nesterinen/HuoneKalenteri/zip/refs/heads/main
*/

if (!defined(constant_name: 'ABSPATH')) {
    exit;
}

global $huone_page_name;
$huone_page_name = 'Tilavaraukset';

global $huone_table_name;
$huone_table_name = 'huone_kalenteri';

global $huone_element_name;
$huone_element_name = 'huoneElement';

global $huone_available_rooms;
$huone_available_rooms = [
    'Neuvotteluhuone' => '#5baa00',
    'Olohuone' => '#0284c9'//'#3788d8'
];

function huone_kalenteri_plugin_activation(): void{
    global $wpdb;
    $wp_table_name = get_huone_table_name();
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS $wp_table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        title varchar(255) NOT NULL,
        room varchar(255),
        start datetime NOT NULL,
        end datetime NOT NULL,
        content varchar(255),
        varaaja varchar(255) NOT NULL,
        PRIMARY KEY  (id)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}
register_activation_hook(__FILE__, 'huone_kalenteri_plugin_activation');


function huone_kalenteri_create_page(): void {
    global $huone_page_name;
    global $huone_element_name;

    $query = new WP_Query(
        [
            'post_type'              => 'page',
            'title'                  => $huone_page_name,
            'post_status'            => 'all',
            'posts_per_page'         => 1,
            'no_found_rows'          => true,
            'ignore_sticky_posts'    => true,
            'update_post_term_cache' => false,
            'update_post_meta_cache' => false,
            'orderby'                => 'post_date ID',
            'order'                  => 'ASC',
        ]
    );

    if ( ! empty( $query->post)) { 
        //write_log('page exists already');
        return;
    }

    $page_content = "<div id='{$huone_element_name}'></div>";//'<div id=' . $huone_element_name . '></div>';
    
    $kalenteri_page = [
        'post_title' => wp_strip_all_tags($huone_page_name),
        'post_content' => $page_content,
        'post_status' => 'publish',
        'post_author' => 1,
        'post_type' => 'page'
    ];
    
    wp_insert_post($kalenteri_page);
}
register_activation_hook(__FILE__, 'huone_kalenteri_create_page');


function get_huone_table_name(): string {
    global $wpdb;
    global $huone_table_name;

    //return $wpdb->prefix . $huone_table_name;
    return "{$wpdb->prefix}{$huone_table_name}";
}

function load_huone_kalenteri():void {
    global $huone_element_name;
    global $huone_page_name;
    global $huone_available_rooms;

    //$plugin_data = get_plugin_data( __FILE__ );
    //$plugin_data['Version']

    if(!is_page($huone_page_name)){
        return;
    }

    wp_enqueue_style(
        handle: 'wsp-styles-hk', 
        src: plugin_dir_url(file: __FILE__) . 'css/main.css',
        deps: [],
        ver: '1.0.8'
    );

    wp_register_script(
        handle: 'fullcalendar-js',
        src: plugin_dir_url( file: __FILE__ ) . "js/fullcalendar/dist/index.global.js",
        ver: null,
        deps: ['jquery']
    );

    wp_enqueue_script( 
        handle: 'main-script',
        src: plugin_dir_url(file: __FILE__) .'js/main.js',
        deps: [
            'fullcalendar-js',
            'jquery'
        ],
        ver: '1.0.8'
    );

    wp_localize_script( 
        handle: 'main-script',
        object_name: 'php_args', 
        l10n: [
            'ajax_url' => admin_url( path: 'admin-ajax.php' ),
            'element_name' => $huone_element_name,
            'huoneet' => $huone_available_rooms
        ]
    );
}

add_action(
    hook_name: 'wp_enqueue_scripts',
    callback: 'load_huone_kalenteri'
);

include plugin_dir_path(__FILE__) . 'ajax/huone_ajax.php';