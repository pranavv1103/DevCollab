package com.devcollab.backend.repository;

import com.devcollab.backend.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    @Query("SELECT m FROM Message m WHERE m.channel.id = :channelId ORDER BY m.timestamp DESC")
    Page<Message> findByChannelIdOrderByTimestampDesc(@Param("channelId") Long channelId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Message> searchByKeyword(@Param("keyword") String keyword);
    
    @Query("SELECT m FROM Message m WHERE m.user.id = :userId")
    List<Message> findByUserId(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.channel.server.id = :serverId AND m.timestamp >= :since")
    long countByChannelServerIdAndTimestampAfter(@Param("serverId") Long serverId, @Param("since") LocalDateTime since);

    // ── Member profile stats ──────────────────────────────────────────────────

    @Query("SELECT COUNT(m) FROM Message m WHERE m.user.id = :userId AND m.channel.server.id = :serverId")
    long countByUserIdAndServerId(@Param("userId") Long userId, @Param("serverId") Long serverId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.user.id = :userId AND m.channel.id = :channelId")
    long countByUserIdAndChannelId(@Param("userId") Long userId, @Param("channelId") Long channelId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.user.id = :userId AND m.channel.server.id = :serverId AND m.parentMessage IS NOT NULL")
    long countRepliesByUserIdAndServerId(@Param("userId") Long userId, @Param("serverId") Long serverId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.user.id = :userId AND m.channel.server.id = :serverId AND m.parentMessage IS NULL")
    long countThreadsByUserIdAndServerId(@Param("userId") Long userId, @Param("serverId") Long serverId);

    /** Returns rows of [channelId (Long), channelName (String), count (Long)] ordered by count desc */
    @Query("SELECT m.channel.id, m.channel.name, COUNT(m) FROM Message m WHERE m.user.id = :userId AND m.channel.server.id = :serverId GROUP BY m.channel.id, m.channel.name ORDER BY COUNT(m) DESC")
    List<Object[]> getChannelActivityByUserIdAndServerId(@Param("userId") Long userId, @Param("serverId") Long serverId);

    /** Returns rows of [dayOffset (Integer 0=today .. 6=6 days ago), count (Long)] for per-day chart */
    @Query(value = """
        SELECT EXTRACT(DAY FROM AGE(CURRENT_DATE, CAST(m.timestamp AS DATE)))::INTEGER AS dayOffset, COUNT(m.id)
        FROM messages m
        JOIN channels c ON m.channel_id = c.id
        WHERE c.server_id = :serverId
          AND m.timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY dayOffset
        ORDER BY dayOffset
        """, nativeQuery = true)
    List<Object[]> getDailyMessageCountsForServer(@Param("serverId") Long serverId);

    @Query("SELECT m FROM Message m WHERE m.channel.id = :channelId AND m.isPinned = true ORDER BY m.timestamp DESC")
    List<Message> findByChannelIdAndIsPinnedTrue(@Param("channelId") Long channelId);

    /** Load a message with its user eagerly — used to avoid LazyInitializationException. */
    @Query("SELECT m FROM Message m JOIN FETCH m.user WHERE m.id = :id")
    java.util.Optional<Message> findByIdWithUser(@Param("id") Long id);
}
