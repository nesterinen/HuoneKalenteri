<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

function huone_get_all(): void {
    global $wpdb;
    $wp_table_name = get_huone_table_name();

    // dont fetch reservations that are more than 2 months old, fetching the whole table is not good for longetivity.
    $time = strtotime(datetime: "-2 month", baseTimestamp: time());
    $year_ago = date(format: "Y-m-d", timestamp: $time);

    $result = $wpdb->get_results("SELECT * FROM {$wp_table_name} WHERE start > '{$year_ago}'");

    if ($result !== false) {
        wp_send_json_success($result, 200);
    } else {
        wp_send_json_error(null, 500);
    }
}
add_action('wp_ajax_huone_get_all', 'huone_get_all');
add_action( 'wp_ajax_nopriv_huone_get_all', 'huone_get_all');

function huone_post_db(): void {
    global $wpdb;
    $wp_table_name = get_huone_table_name();

    $result = $wpdb->insert($wp_table_name, [
        'room' => $_POST['room'],
        'title' => $_POST['title'],
        'start' => $_POST['start'],
        "end" =>  $_POST['end'],
        "content" => $_POST['content'],
        "varaaja" => $_POST['varaaja']
    ]);

    switch (true) {
        case $result === false:
            wp_send_json_error($result, 500);
            break;
        
        case $result === 0:
            wp_send_json_error($result, 400);
            break;

        case $result >= 1:
            wp_send_json_success(array("id" => $wpdb->insert_id), 200);
    }
}
add_action('wp_ajax_huone_post_db', 'huone_post_db');
add_action( 'wp_ajax_nopriv_huone_post_db', 'huone_post_db');

function huone_delete_db(): void {
    global $wpdb;
    $wp_table_name = get_huone_table_name();

    $result = $wpdb->delete($wp_table_name, ['ID' => $_POST['id']]);

    switch (true) {
        case $result === false:
            wp_send_json_error($result, 500);
            break;
        
        case $result === 0:
            wp_send_json_error($result, 400);
            break;

        case $result >= 1:
            wp_send_json_success(array("message" => "wpdb delete completed successfully"), 200);
    }
}
add_action('wp_ajax_huone_delete_db', 'huone_delete_db');
add_action( 'wp_ajax_nopriv_huone_delete_db', 'huone_delete_db');

function huone_update_db(): void {
    global $wpdb;
    $wp_table_name = get_huone_table_name();

    $result = $wpdb->update($wp_table_name,
        [
            "start" => $_POST["start"],
            "end" => $_POST["end"]
        ],
        [
            "ID"=> $_POST["id"]
        ]
    );

    switch (true) {
        case $result === false:
            wp_send_json_error($result, 500);
            break;
        
        case $result === 0:
            wp_send_json_error($result, 400);
            break;

        case $result >= 1:
            wp_send_json_success(array("message" => "wpdb update completed successfully"), 200);
    }
}
add_action('wp_ajax_huone_update_db', 'huone_update_db');
add_action( 'wp_ajax_nopriv_huone_update_db', 'huone_update_db');

function huone_post_db_multi(): void {
    global $wpdb;
    $wp_table_name = get_huone_table_name();

    $values = [];

    foreach ($_POST['dates'] as $key => $event) {
        $values[] = $wpdb->prepare(
            '(%s,%s,%s,%s,%s,%s)',
            $_POST['title'],
            $event['start'],
            $event['end'],
            $_POST['varaaja'],
            $_POST['content'],
            $_POST['room']
        );
    }

    // mySQL does not support RETURNING ids like postgress does....
    $query = "INSERT INTO {$wp_table_name} (title, start, end, varaaja, content, room) VALUES ";
    $query .= implode(",\n", $values);

    $result = $wpdb->query($query);

    switch (true) {
        case $result === false:
            wp_send_json_error($result, 500);
            break;
        
        case $result === 0:
            wp_send_json_error($result, 400);
            break;

        case $result >= 1:
            wp_send_json_success(array("result" => $result), 200);
    }
}

add_action('wp_ajax_huone_post_db_multi', 'huone_post_db_multi');
add_action( 'wp_ajax_nopriv_huone_post_db_multi', 'huone_post_db_multi');

function huone_delete_db_varaaja() {
    global $wpdb;
    $wp_table_name = get_huone_table_name();

    $result = $wpdb->delete($wp_table_name, array('varaaja' => $_POST['varaaja']));
  
    switch (true) {
        case $result === false:
            wp_send_json_error($result, 500);
            break;
        
        case $result === 0:
            wp_send_json_error($result, 400);
            break;

        case $result >= 1:
            wp_send_json_success(array("message" => "wpdb delete completed successfully"), 200);
    }
}
add_action('wp_ajax_huone_delete_db_varaaja', 'huone_delete_db_varaaja');
add_action( 'wp_ajax_nopriv_huone_delete_db_varaaja', 'huone_delete_db_varaaja');