package br.com.rpm33.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Log;

public interface LogRepository extends JpaRepository<Log, Long> {
}
