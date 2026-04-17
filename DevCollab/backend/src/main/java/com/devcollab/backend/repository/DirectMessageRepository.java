package com.devcollab.backend.repository;

import com.devcollab.backend.entity.DirectMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

    @Query("""
            SELECT dm FROM DirectMessage dm
            WHERE (dm.sender.id = :userA AND dm.recipient.id = :userB)
               OR (dm.sender.id = :userB AND dm.recipient.id = :userA)
            ORDER BY dm.timestamp ASC
            """)
    List<DirectMessage> findConversation(@Param("userA") Long userA, @Param("userB") Long userB);

    @Query("""
            SELECT COUNT(dm) FROM DirectMessage dm
            WHERE dm.recipient.id = :userId AND dm.read = false
            """)
    long countUnreadForUser(@Param("userId") Long userId);

    @Query("""
            SELECT COUNT(dm) FROM DirectMessage dm
            WHERE dm.recipient.id = :recipientId
              AND dm.sender.id = :senderId
              AND dm.read = false
            """)
    long countUnreadFromSender(@Param("recipientId") Long recipientId, @Param("senderId") Long senderId);

    @Modifying
    @Transactional
    @Query("""
            UPDATE DirectMessage dm
            SET dm.read = true
            WHERE dm.recipient.id = :recipientId
              AND dm.sender.id = :senderId
              AND dm.read = false
            """)
    void markAllReadFromSender(@Param("recipientId") Long recipientId, @Param("senderId") Long senderId);

    /** Distinct partner IDs for a user's DM inbox (most recent message first) */
    @Query(value = """
            SELECT partner_id FROM (
                SELECT
                    CASE WHEN sender_id = :userId THEN recipient_id ELSE sender_id END AS partner_id,
                    MAX(timestamp) AS last_ts
                FROM direct_messages
                WHERE sender_id = :userId OR recipient_id = :userId
                GROUP BY partner_id
            ) t
            ORDER BY last_ts DESC
            """, nativeQuery = true)
    List<Long> findConversationPartnerIds(@Param("userId") Long userId);
}
