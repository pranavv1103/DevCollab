package com.devcollab.backend.repository;

import com.devcollab.backend.entity.Reaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {
    @Query("SELECT r FROM Reaction r WHERE r.message.id = :messageId")
    List<Reaction> findByMessageId(@Param("messageId") Long messageId);
}
