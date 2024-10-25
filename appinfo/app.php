<?php
/**
 * Load Javascript
 */
use OCP\Util;
$eventDispatcher = \OC::$server->get(\OCP\EventDispatcher\IEventDispatcher);
$eventDispatcher->addListener('OCA\Files::loadAdditionalScripts', function(){
    Util::addScript('video_converter', 'conversion' );
    Util::addStyle('video_converter', 'style' );
});
