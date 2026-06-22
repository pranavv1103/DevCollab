package com.hrpilot.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Declares Kafka topics. Spring Kafka auto-creates them on the broker if they don't exist.
 *
 * Beginners' note:
 * Kafka is a message queue / event bus.
 * - "document.uploaded" is a topic (channel) where producers send messages.
 * - Consumers subscribe to topics and receive messages asynchronously.
 * - This decouples PDF upload (fast, HTTP response to user) from PDF processing (slow, background).
 */
@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic documentUploadedTopic() {
        return TopicBuilder.name("document.uploaded")
                .partitions(3)
                .replicas(1)
                .build();
    }
}
