package com.devcollab.backend.repository;

import com.devcollab.backend.entity.Poll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PollRepository extends JpaRepository<Poll, Long> {
    @Query("SELECT p FROM Poll p WHERE p.channel.id = :channelId ORDER BY p.createdAt DESC")
    List<Poll> findByChannelIdOrderByCreatedAtDesc(@Param("channelId") Long channelId);
}
