package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.BandeiraCartao;

public interface BandeiraCartaoRepository extends JpaRepository<BandeiraCartao, Long> {

  Optional<BandeiraCartao> findByDescIgnoreCase(String desc);
}
