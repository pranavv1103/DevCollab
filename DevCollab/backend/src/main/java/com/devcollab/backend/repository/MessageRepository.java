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
}
