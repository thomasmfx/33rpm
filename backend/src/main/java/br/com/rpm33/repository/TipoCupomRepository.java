package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.TipoCupom;

public interface TipoCupomRepository extends JpaRepository<TipoCupom, Long> {

  Optional<TipoCupom> findByDescIgnoreCase(String desc);
}
